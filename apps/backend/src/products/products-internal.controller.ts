import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AgentContext } from '../common/decorators/agent-context.decorator';
import { AgentInternalGuard } from '../common/guards/agent-internal.guard';
import { AgentMtlsGuard } from '../common/guards/internal-client-certificate.guard';
import type { AgentRequestContext } from '../common/guards/agent-internal.guard';

import { BatchUpdateProductImageIndexingDto } from './dto/batch-update-product-image-indexing.dto';
import { ProductsInternalService } from './products-internal.service';
import {
  parseKeywordsQuery,
  parsePositiveIntQuery,
} from './utils/products-query.utils';

@ApiTags('products')
@ApiBearerAuth()
@Controller('agent-internal/products')
@UseGuards(AgentMtlsGuard, AgentInternalGuard)
export class ProductsInternalController {
  constructor(
    private readonly productsInternalService: ProductsInternalService,
  ) {}

  @Get('sample')
  @ApiOperation({
    summary: 'Ambil sampel produk',
    description:
      'Endpoint internal backend, dipanggil oleh whatsapp-agent untuk mengambil sampel representatif katalog (pembuatan/pembaruan prompt deskripsi gambar). Tidak ditujukan untuk frontend.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sampel produk agent dikembalikan',
  })
  @ApiResponse({
    status: 401,
    description: 'JWT antar-layanan tidak valid atau tidak ada',
  })
  async getSampleProducts(
    @AgentContext() context: AgentRequestContext,
    @Query('max') max?: string,
    @Query('perCollection') perCollection?: string,
  ) {
    const maxProducts = parsePositiveIntQuery(max, 20);
    const maxPerCollection = parsePositiveIntQuery(perCollection, 3);

    return this.productsInternalService.getSampleProducts(
      context.userId,
      maxProducts,
      maxPerCollection,
    );
  }

  @Get('by-retailer-id/:retailerId')
  @ApiOperation({
    summary: 'Cari produk berdasarkan retailer_id',
    description:
      'Endpoint internal backend, dipanggil oleh pipeline image whatsapp-agent setelah OCR untuk mencocokkan produk dengan cepat melalui kode retailer.',
  })
  @ApiResponse({
    status: 200,
    description: 'Produk yang cocok dikembalikan (atau null)',
  })
  @ApiResponse({
    status: 400,
    description: 'retailerId tidak ada atau tidak valid',
  })
  @ApiResponse({
    status: 401,
    description: 'JWT antar-layanan tidak valid atau tidak ada',
  })
  async getProductByRetailerId(
    @AgentContext() context: AgentRequestContext,
    @Param('retailerId') retailerId: string,
  ) {
    const normalizedRetailerId = retailerId?.trim();
    if (!normalizedRetailerId) {
      throw new BadRequestException('retailerId wajib diisi');
    }

    return this.productsInternalService.getProductByRetailerId(
      context.userId,
      normalizedRetailerId,
    );
  }

  @Get('by-id/:productId')
  @ApiOperation({
    summary: 'Cari produk berdasarkan ID internal/WhatsApp/retailer',
    description:
      'Endpoint internal backend, dipanggil oleh whatsapp-agent untuk meneruskan ID produk ke produk bisnis dan whatsapp_product_id-nya.',
  })
  @ApiResponse({
    status: 200,
    description: 'Produk yang cocok dikembalikan (atau null)',
  })
  @ApiResponse({
    status: 400,
    description: 'productId tidak ada atau tidak valid',
  })
  @ApiResponse({
    status: 401,
    description: 'JWT antar-layanan tidak valid atau tidak ada',
  })
  async getProductByAnyId(
    @AgentContext() context: AgentRequestContext,
    @Param('productId') productId: string,
  ) {
    const normalizedProductId = productId?.trim();
    if (!normalizedProductId) {
      throw new BadRequestException('productId wajib diisi');
    }

    return this.productsInternalService.getProductByAnyId(
      context.userId,
      normalizedProductId,
    );
  }

  @Get('by-ids')
  @ApiOperation({
    summary:
      'Cari beberapa produk berdasarkan ID internal/WhatsApp/retailer',
    description:
      'Endpoint internal backend, dipanggil oleh whatsapp-agent untuk meneruskan beberapa ID produk dan mengambil data yang diperlukan untuk membuat preview tautan produk.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar pencocokan yang diurutkan dikembalikan',
  })
  @ApiResponse({
    status: 400,
    description: 'Tidak ada ID valid yang diberikan',
  })
  @ApiResponse({
    status: 401,
    description: 'JWT antar-layanan tidak valid atau tidak ada',
  })
  async getProductsByAnyIds(
    @AgentContext() context: AgentRequestContext,
    @Query('ids') ids: string | string[],
  ) {
    const parsedIds = parseKeywordsQuery(ids);

    if (parsedIds.length === 0) {
      throw new BadRequestException('Setidaknya satu id wajib diisi');
    }

    return this.productsInternalService.getProductsByAnyIds(
      context.userId,
      parsedIds,
    );
  }

  @Get('search-by-keywords')
  @ApiOperation({
    summary: 'Cari produk berdasarkan kata kunci',
    description:
      'Endpoint internal backend, dipanggil oleh whatsapp-agent untuk pencarian OCR tekstual. Pencocokan dilakukan secara ketat pada retailer_id.',
  })
  @ApiResponse({
    status: 200,
    description: 'Produk dan kata kunci yang cocok dikembalikan',
  })
  @ApiResponse({
    status: 400,
    description: 'Tidak ada kata kunci valid yang diberikan',
  })
  @ApiResponse({
    status: 401,
    description: 'JWT antar-layanan tidak valid atau tidak ada',
  })
  async searchProductsByKeywords(
    @AgentContext() context: AgentRequestContext,
    @Query('keywords') keywords: string | string[],
  ) {
    const parsedKeywords = parseKeywordsQuery(keywords);

    if (parsedKeywords.length === 0) {
      throw new BadRequestException('Setidaknya satu kata kunci wajib diisi');
    }

    return this.productsInternalService.searchProductsByKeywords(
      context.userId,
      parsedKeywords,
    );
  }

  @Patch('cover-image-descriptions')
  @ApiOperation({
    summary:
      'Perbarui batch deskripsi cover dan status pengindeksan',
    description:
      'Endpoint internal backend, dipanggil oleh whatsapp-agent pada akhir pengindeksan untuk menyimpan deskripsi cover dan mengatur ulang flag pengindeksan ke false (produk dan gambar) dalam satu permintaan.',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch diterapkan pada produk milik agent ini',
  })
  @ApiResponse({
    status: 401,
    description: 'JWT antar-layanan tidak valid atau tidak ada',
  })
  async batchUpdateProductImageIndexing(
    @AgentContext() context: AgentRequestContext,
    @Body() dto: BatchUpdateProductImageIndexingDto,
  ) {
    return this.productsInternalService.batchUpdateImageIndexing(
      context.userId,
      dto.updates,
    );
  }

  @Get('for-image-indexing')
  @ApiOperation({
    summary: 'Daftar produk untuk pengindeksan gambar',
    description:
      'Endpoint internal backend, dipanggil oleh whatsapp-agent untuk mengambil produk dan gambar cover mereka yang akan diindeks di Qdrant (pemrosesan dilakukan di sisi agent).',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar produk siap untuk pengindeksan gambar',
  })
  @ApiResponse({
    status: 401,
    description: 'JWT antar-layanan tidak valid atau tidak ada',
  })
  async getProductsForImageIndexing(
    @AgentContext() context: AgentRequestContext,
  ) {
    return this.productsInternalService.getProductsForImageIndexing(
      context.userId,
    );
  }
}
