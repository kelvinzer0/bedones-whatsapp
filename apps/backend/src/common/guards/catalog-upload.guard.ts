import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

interface CatalogUploadTokenPayload {
  clientId: string;
  type: 'catalog-upload';
  iat?: number;
  exp?: number;
}

/**
 * Guard pour vérifier et extraire le clientId du token JWT
 * Le token doit contenir { clientId: string, type: 'catalog-upload' }
 */
@Injectable()
export class CatalogUploadGuard implements CanActivate {
  private readonly logger = new Logger(CatalogUploadGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { clientId?: string }>();

    // Récupérer le token depuis le header Authorization
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.error('❌ Missing or invalid Authorization header');
      throw new UnauthorizedException('Token tidak ada atau tidak valid');
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    try {
      // Vérifier et décoder le token
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        throw new Error('JWT_SECRET tidak dikonfigurasi');
      }

      const payload = jwt.verify(token, jwtSecret) as CatalogUploadTokenPayload;

      // Vérifier le type de token
      if (payload.type !== 'catalog-upload') {
        this.logger.error('❌ Invalid token type');
        throw new UnauthorizedException('Tipe token tidak valid');
      }

      // Vérifier que le clientId est présent
      if (!payload.clientId) {
        this.logger.error('❌ Token missing clientId');
        throw new UnauthorizedException('Token tidak memiliki clientId');
      }

      // Injecter le clientId dans la requête
      request.clientId = payload.clientId;

      this.logger.debug(`✅ Token verified for client: ${payload.clientId}`);
      return true;
    } catch (error: any) {
      if (error instanceof jwt.JsonWebTokenError) {
        this.logger.error('❌ Invalid token signature');
        throw new UnauthorizedException('Token tidak valid');
      } else if (error instanceof jwt.TokenExpiredError) {
        this.logger.error('❌ Token expired');
        throw new UnauthorizedException('Token kedaluwarsa');
      }

      this.logger.error(`❌ Token verification failed: ${error.message}`);
      throw new UnauthorizedException('Verifikasi token gagal');
    }
  }
}
