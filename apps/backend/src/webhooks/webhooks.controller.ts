import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Post,
  Logger,
  Inject,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import * as Sentry from '@sentry/nestjs';

import { ConnectorSignatureGuard } from '../common/guards/connector-signature.guard';
import { ConnectorMtlsGuard } from '../common/guards/internal-client-certificate.guard';
import { AuthGateway } from '../auth/auth.gateway';
import { AuthService } from '../auth/auth.service';

class WhatsAppConnectedDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsOptional()
  profile: unknown;

  @IsString()
  @IsNotEmpty()
  id: string;
}

// DTO de base pour recevoir les événements
// On valide seulement les champs de base, le reste sera validé selon le type d'événement
class WhatsAppEventDto {
  @IsString()
  @IsNotEmpty()
  event: string;

  @IsString()
  @IsNotEmpty()
  timestamp: string;

  // On accepte n'importe quelle donnée, mais on la validera manuellement selon l'événement
  @IsOptional()
  data?: unknown;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  connectorInstanceId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@ApiTags('webhooks')
@Controller('webhooks')
@UseGuards(ConnectorMtlsGuard, ConnectorSignatureGuard)
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly authGateway: AuthGateway,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private captureWebhookException(
    operation: string,
    error: unknown,
    context: Record<string, unknown> = {},
  ) {
    const userId =
      typeof context.userId === 'string' ? context.userId : undefined;

    Sentry.captureException(error, {
      tags: {
        domain: 'webhooks',
        operation,
        service: 'backend',
      },
      user: userId ? { id: userId } : undefined,
      contexts: {
        webhook: context,
      },
    });
  }

  @Post('whatsapp/connected')
  @ApiOperation({
    summary: 'Webhook dipanggil saat WhatsApp terhubung',
    description:
      'Endpoint dipanggil oleh whatsapp-connector saat klien WhatsApp siap',
  })
  @ApiResponse({
    status: 200,
    description: 'Koneksi berhasil diproses',
  })
  async whatsappConnected(@Body() data: WhatsAppConnectedDto) {
    this.logger.log(`WhatsApp connected for: ${data.phoneNumber}`);

    try {
      // Appeler le service d'auth pour compléter le pairing
      // Note: The AuthService will automatically trigger user data synchronization
      // (profile, business info, catalog) in the background
      const result = await this.authService.verifyPairingSuccess(
        data.phoneNumber,
        {
          profile: data.profile,
        },
      );

      this.logger.log(
        `Pairing verified for user: ${result.user.id} (${result.user.phoneNumber})`,
      );

      // Notify WebSocket clients of successful connection
      const cacheKey = `qr-session:${data.phoneNumber}`;
      const pairingToken = await this.cacheManager.get<string>(cacheKey);

      if (pairingToken) {
        this.logger.log(
          `Notifying WebSocket client of successful connection: ${pairingToken}`,
        );
        this.authGateway.emitConnectionSuccess(pairingToken);

        // Clean up cache
        await this.cacheManager.del(cacheKey);
      } else {
        this.logger.warn(`No active QR session found for ${data.phoneNumber}`);
      }

      return {
        success: true,
        message: 'Koneksi WhatsApp berhasil diproses',
        userId: result.user.id,
      };
    } catch (error: any) {
      this.logger.error(
        `Error processing WhatsApp connection: ${error.message}`,
        error.stack,
      );
      this.captureWebhookException(
        'whatsapp_connected.process_pairing_success',
        error,
        {
          connectorClientId: data.id,
          hasProfile: typeof data.profile !== 'undefined',
          phoneNumber: data.phoneNumber,
        },
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('whatsapp/events')
  @ApiOperation({
    summary: 'Webhook untuk semua event WhatsApp',
    description:
      'Endpoint dipanggil oleh whatsapp-connector untuk semua event (qr, authenticated, dll.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Event berhasil diproses',
  })
  async whatsappEvents(@Body() payload: WhatsAppEventDto) {
    const timestamp = new Date().toISOString();
    this.logger.log(
      `[${timestamp}] 📨 Received event: ${payload.event} from connector`,
    );
    this.logger.debug(
      `[${timestamp}] 📦 Payload details: ${JSON.stringify({
        event: payload.event,
        timestamp: payload.timestamp,
        dataType: Array.isArray(payload.data) ? 'array' : typeof payload.data,
        dataLength: Array.isArray(payload.data) ? payload.data.length : 'N/A',
      })}`,
    );

    try {
      // Handle QR code event
      if (payload.event === 'qr') {
        // Validation stricte des données QR
        if (!Array.isArray(payload.data)) {
          this.logger.warn(
            `[${timestamp}] ⚠️ QR event data is not an array: ${typeof payload.data}`,
          );
          throw new BadRequestException('Data event QR harus berupa array');
        }

        if (payload.data.length === 0) {
          this.logger.warn(`[${timestamp}] ⚠️ QR event data array is empty`);
          throw new BadRequestException('Array data event QR tidak boleh kosong');
        }

        const [qrCode] = payload.data;

        if (typeof qrCode !== 'string' || qrCode.trim().length === 0) {
          this.logger.warn(`[${timestamp}] ⚠️ QR code is not a valid string`);
          throw new BadRequestException('Kode QR harus berupa string non-empty');
        }

        this.logger.log(
          `[${timestamp}] 🔐 QR code received from connector (length: ${qrCode.length} chars)`,
        );

        if (payload.connectorInstanceId) {
          const pairingToken = await this.cacheManager.get<string>(
            `connector-session:${payload.connectorInstanceId}`,
          );

          if (pairingToken) {
            this.logger.log(
              `[${timestamp}] ➡️ Emitting targeted QR update for connector ${payload.connectorInstanceId}`,
            );
            this.authGateway.emitQRCode(pairingToken, qrCode);

            return {
              success: true,
              message: 'Kode QR yang ditargetkan berhasil dikirim',
            };
          }
        }

        // Fallback broadcast for local/dev mode
        const keys = await this.cacheManager.store.keys?.('qr-session:*');

        if (keys && keys.length > 0) {
          this.logger.log(
            `[${timestamp}] 📡 Broadcasting QR code to ${keys.length} active session(s)`,
          );

          for (const key of keys) {
            const phoneNumber = key.replace('qr-session:', '');
            const pairingToken = await this.cacheManager.get<string>(key);

            if (pairingToken) {
              this.logger.log(
                `[${timestamp}] ➡️ Emitting QR update to ${phoneNumber} (token: ${pairingToken})`,
              );
              this.authGateway.emitQRCode(pairingToken, qrCode);
            }
          }

          this.logger.log(
            `[${timestamp}] ✅ QR code successfully broadcasted to ${keys.length} session(s)`,
          );

          return {
            success: true,
            message: `Kode QR disiarkan ke ${keys.length} sesi`,
          };
        } else {
          this.logger.warn(
            `[${timestamp}] ⚠️ Received QR code but no active sessions found`,
          );
          return {
            success: true,
            message: 'Tidak ada sesi aktif untuk disiarkan',
          };
        }
      }

      // Handle pairing success event (WhatsApp connected)
      if (payload.event === 'pairing_success') {
        this.logger.log(
          `[${timestamp}] 🎉 Pairing success event received from connector`,
        );

        // Validation stricte des données de pairing_success
        if (
          !payload.data ||
          typeof payload.data !== 'object' ||
          Array.isArray(payload.data)
        ) {
          this.logger.warn(
            `[${timestamp}] ⚠️ Pairing success event data is not a valid object`,
          );
          throw new BadRequestException(
            'Data pairing success harus berupa objek yang valid',
          );
        }

        const data = payload.data as Record<string, unknown>;

        // Valider phoneNumber
        if (
          !data.phoneNumber ||
          typeof data.phoneNumber !== 'string' ||
          data.phoneNumber.trim().length === 0
        ) {
          this.logger.warn(
            `[${timestamp}] ⚠️ Pairing success event missing or invalid phoneNumber`,
          );
          throw new BadRequestException(
            'phoneNumber tidak ada atau tidak valid dalam data pairing success',
          );
        }

        // Valider id
        if (
          !data.id ||
          typeof data.id !== 'string' ||
          data.id.trim().length === 0
        ) {
          this.logger.warn(
            `[${timestamp}] ⚠️ Pairing success event missing or invalid id`,
          );
          throw new BadRequestException(
            'id tidak ada atau tidak valid dalam data pairing success',
          );
        }

        // Créer un objet typé avec les données validées
        const connectionData: {
          phoneNumber: string;
          id: string;
          profile?: unknown;
          hasProfile?: boolean;
        } = {
          phoneNumber: data.phoneNumber,
          id: data.id,
          profile: data.profile,
          hasProfile: data.hasProfile as boolean | undefined,
        };

        this.logger.log(
          `[${timestamp}] 📱 WhatsApp connected for: ${connectionData.phoneNumber}`,
        );

        // Call the existing whatsappConnected method logic
        try {
          const result = await this.authService.verifyPairingSuccess(
            connectionData.phoneNumber,
            {
              profile: connectionData.profile,
            },
          );

          this.logger.log(
            `[${timestamp}] ✅ Pairing verified for user: ${result.user.id} (${result.user.phoneNumber})`,
          );

          // Notify WebSocket clients of successful connection
          const cacheKey = `qr-session:${connectionData.phoneNumber}`;
          const pairingToken = await this.cacheManager.get<string>(cacheKey);

          if (pairingToken) {
            this.logger.log(
              `[${timestamp}] 📤 Notifying WebSocket client of successful connection: ${pairingToken}`,
            );
            this.authGateway.emitConnectionSuccess(pairingToken);

            // Clean up cache
            await this.cacheManager.del(cacheKey);
          } else {
            this.logger.warn(
              `[${timestamp}] ⚠️ No active QR session found for ${connectionData.phoneNumber}`,
            );
          }

          return {
            success: true,
            message: 'Koneksi WhatsApp berhasil diproses',
            userId: result.user.id,
          };
        } catch (error: any) {
          this.logger.error(
            `[${timestamp}] ❌ Error processing WhatsApp connection: ${error.message}`,
            error.stack,
          );
          this.captureWebhookException(
            'whatsapp_events.pairing_success.process_pairing_success',
            error,
            {
              connectorClientId: connectionData.id,
              event: payload.event,
              hasProfile: typeof connectionData.profile !== 'undefined',
              phoneNumber: connectionData.phoneNumber,
              webhookTimestamp: payload.timestamp,
            },
          );

          return {
            success: false,
            error: error.message,
          };
        }
      }

      // Handle other events if needed
      this.logger.log(`[${timestamp}] ℹ️ Event ${payload.event} processed`);
      return {
        success: true,
        message: `Event ${payload.event} diterima`,
      };
    } catch (error: any) {
      this.logger.error(
        `[${timestamp}] ❌ Error processing event ${payload.event}: ${error.message}`,
        error.stack,
      );

      if (payload.event === 'pairing_success') {
        const data = isRecord(payload.data) ? payload.data : null;
        this.captureWebhookException(
          'whatsapp_events.pairing_success.validation_or_processing',
          error,
          {
            connectorClientId:
              typeof data?.id === 'string' ? data.id : undefined,
            event: payload.event,
            hasData: typeof payload.data !== 'undefined',
            phoneNumber:
              typeof data?.phoneNumber === 'string'
                ? data.phoneNumber
                : undefined,
            webhookTimestamp: payload.timestamp,
          },
        );
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }
}
