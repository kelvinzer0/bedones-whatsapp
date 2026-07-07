import {
  Controller,
  Post,
  Get,
  Body,
  BadRequestException,
  Logger,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { ClientId } from '../common/decorators/client-id.decorator';
import { CatalogUploadGuard } from '../common/guards/catalog-upload.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

import { CatalogService } from './catalog.service';
import type { CatalogData, ClientInfoData } from './types/catalog.types';

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  private readonly logger = new Logger(CatalogController.name);

  constructor(private readonly catalogService: CatalogService) {}

  @Post('upload-image')
  @UseGuards(CatalogUploadGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload gambar produk dari connector',
    description:
      'Endpoint dipanggil oleh script yang dijalankan di connector untuk mengupload gambar produk. clientId diekstrak dari token JWT untuk alasan keamanan. Menerima data dalam base64 (JSON) dari nodeFetch.',
  })
  @ApiResponse({
    status: 200,
    description: 'Gambar berhasil diupload',
    schema: {
      example: {
        success: true,
        url: 'https://files-flemme.bedones.com/whatsapp-agent/cmd2a8ykg0004uh5f2cn5u4w1/catalog/images/cmd2a8ykg0004uh5f2cn5u4w1-25095720553426064-0.jpg',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Kesalahan saat upload',
  })
  @ApiResponse({
    status: 401,
    description: 'Token tidak valid atau kedaluwarsa',
  })
  async uploadImage(
    @ClientId() clientId: string, // Extrait du token JWT
    @Body('image') imageBase64: string,
    @Body('filename') filename: string,
    @Body('productId') productId: string,
    @Body('imageIndex') imageIndex: string,
    @Body('imageType') imageType: string,
    @Body('originalUrl') originalUrl?: string,
  ) {
    if (!imageBase64 || !filename) {
      throw new BadRequestException('Data gambar atau nama file tidak ada');
    }

    if (!productId || !imageIndex) {
      throw new BadRequestException('Field wajib tidak ada');
    }

    this.logger.debug(
      `Receiving image (base64): client=${clientId}, product=${productId}, index=${imageIndex}, type=${imageType || 'unknown'}, filename=${filename}, originalUrl=${originalUrl || 'n/a'}`,
    );

    // Convertir base64 en Buffer
    // Format: "data:image/jpeg;base64,/9j/4AAQ..."
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    this.logger.debug(
      `Decoded image payload: client=${clientId}, product=${productId}, index=${imageIndex}, bytes=${buffer.length}, base64Length=${base64Data.length}`,
    );

    const result = await this.catalogService.uploadProductImage(
      buffer,
      productId,
      clientId,
      parseInt(imageIndex, 10),
      imageType || 'unknown',
      filename,
    );

    if (!result.success) {
      this.logger.error(
        `❌ Upload failed for product ${productId}, index ${imageIndex}, client=${clientId}, filename=${filename}: ${result.error}`,
      );
      throw new BadRequestException(result.error || 'Upload gagal');
    }

    this.logger.log(
      `✅ Image uploaded successfully: product=${productId}, index=${imageIndex}`,
    );
    this.logger.log(`   URL Minio: ${result.url}`);
    if (originalUrl) {
      this.logger.log(`   URL WhatsApp: ${originalUrl}`);
    }

    return {
      success: true,
      url: result.url,
      metadata: {
        productId,
        imageIndex: parseInt(imageIndex, 10),
        imageType,
        originalUrl,
      },
    };
  }

  @Post('upload-avatar')
  @UseGuards(CatalogUploadGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload avatar akun WhatsApp',
    description:
      'Endpoint dipanggil oleh script yang dijalankan di connector untuk mengupload avatar akun. clientId diekstrak dari token JWT. Menerima data dalam base64 (JSON) dari nodeFetch.',
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar berhasil diupload',
  })
  async uploadAvatar(
    @ClientId() clientId: string,
    @Body('avatar') avatarBase64: string,
    @Body('filename') filename: string,
    @Body('originalUrl') originalUrl?: string,
  ) {
    if (!avatarBase64 || !filename) {
      throw new BadRequestException('Data avatar atau nama file tidak ada');
    }

    this.logger.debug(`Receiving avatar (base64) for client: ${clientId}`);

    // Convertir base64 en Buffer
    const base64Data = avatarBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const result = await this.catalogService.uploadAvatar(
      buffer,
      clientId,
      filename,
    );

    if (!result.success) {
      throw new BadRequestException(result.error || 'Upload gagal');
    }

    return {
      success: true,
      url: result.url,
      metadata: {
        originalUrl,
      },
    };
  }

  @Post('save-client-info')
  @UseGuards(CatalogUploadGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Simpan informasi klien WhatsApp',
    description:
      'Endpoint dipanggil oleh script untuk menyimpan informasi akun WhatsApp Business.',
  })
  @ApiResponse({
    status: 200,
    description: 'Informasi berhasil disimpan',
  })
  async saveClientInfo(
    @ClientId() clientId: string,
    @Body() clientInfo: ClientInfoData,
  ) {
    this.logger.debug(`Saving client info for: ${clientId}`);

    const result = await this.catalogService.saveClientInfo(
      clientId,
      clientInfo,
    );

    if (!result.success) {
      throw new BadRequestException(result.error || 'Simpan gagal');
    }

    return {
      success: true,
      message: 'Info klien berhasil disimpan',
    };
  }

  @Post('save-catalog')
  @UseGuards(CatalogUploadGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Simpan katalog (koleksi dan produk)',
    description:
      'Endpoint dipanggil oleh script untuk menyimpan katalog lengkap dengan koleksi dan produk.',
  })
  @ApiResponse({
    status: 200,
    description: 'Katalog berhasil disimpan',
  })
  async saveCatalog(
    @ClientId() clientId: string,
    @Body() catalogData: CatalogData,
  ) {
    this.logger.debug(`Saving catalog for: ${clientId}`);

    const result = await this.catalogService.saveCatalog(clientId, catalogData);

    if (!result.success) {
      throw new BadRequestException(result.error || 'Simpan gagal');
    }

    return {
      success: true,
      message: 'Katalog berhasil disimpan',
      stats: result.stats,
    };
  }

  @Post('delete-images')
  @UseGuards(CatalogUploadGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Hapus gambar usang',
    description:
      'Endpoint dipanggil oleh script untuk menghapus gambar yang tidak lagi ada di katalog WhatsApp. Menghapus file dari Minio dan entri dari database.',
  })
  @ApiResponse({
    status: 200,
    description: 'Gambar berhasil dihapus',
    schema: {
      example: {
        success: true,
        deletedCount: 5,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Kesalahan saat menghapus',
  })
  @ApiResponse({
    status: 401,
    description: 'Token tidak valid atau kedaluwarsa',
  })
  async deleteImages(
    @ClientId() clientId: string,
    @Body('imageIds') imageIds: string[],
  ) {
    this.logger.debug(
      `Deleting ${imageIds?.length || 0} images for: ${clientId}`,
    );

    if (!imageIds || !Array.isArray(imageIds)) {
      throw new BadRequestException('imageIds harus berupa array');
    }

    const result = await this.catalogService.deleteImages(imageIds);

    if (!result.success) {
      throw new BadRequestException(result.error || 'Hapus gagal');
    }

    return {
      success: true,
      deletedCount: result.deletedCount,
    };
  }

  @Post('force-sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Force catalog synchronization',
    description:
      'Triggers full catalog sync: backend (via connector) + whatsapp-agent (local with embeddings). Updates lastCatalogSyncedAt.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync completed successfully',
    schema: {
      example: {
        success: true,
        backendSync: { success: true },
        agentSync: { success: true, message: 'Sync completed' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT required',
  })
  @ApiResponse({
    status: 400,
    description: 'Sync failed',
    schema: {
      example: {
        success: false,
        error: 'WhatsApp agent not configured',
      },
    },
  })
  async forceCatalogSync(@Req() req: any) {
    const userId = req.user.id; // Extract from JWT
    this.logger.log(`Force sync requested by user: ${userId}`);

    const result = await this.catalogService.forceCatalogSync(userId);

    if (!result.success) {
      throw new BadRequestException(result.error || 'Sinkronisasi gagal');
    }

    return result;
  }

  @Get('image-sync-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get image sync status',
    description:
      'Endpoint frontend (dashboard katalog) untuk menampilkan status sinkronisasi gambar asinkron (SYNCING/DONE/FAILED) setelah force-sync.',
  })
  @ApiResponse({
    status: 200,
    description: 'Image sync status retrieved successfully',
  })
  async getImageSyncStatus(@Req() req: any) {
    const userId = req.user.id;
    const status = await this.catalogService.getImageSyncStatus(userId);

    if (!status) {
      throw new BadRequestException('Agent WhatsApp tidak dikonfigurasi');
    }

    return status;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ambil katalog pengguna',
    description:
      'Mengembalikan semua koleksi dengan produknya dan produk yang tidak terkategori.',
  })
  @ApiResponse({
    status: 200,
    description: 'Katalog berhasil diambil',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT required',
  })
  async getCatalog(@Req() req: any) {
    const userId = req.user.id;
    this.logger.debug(`Fetching catalog for user: ${userId}`);

    const result = await this.catalogService.getCatalog(userId);

    if (!result.success) {
      throw new BadRequestException(result.error || 'Gagal mengambil katalog');
    }

    return result;
  }
}
