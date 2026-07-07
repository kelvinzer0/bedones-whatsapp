import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
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

import { UpdateAgentInternalDto } from './dto/update-agent-internal.dto';
import { WhatsAppAgentInternalService } from './whatsapp-agent-internal.service';

@ApiTags('whatsapp-agents')
@ApiBearerAuth()
@Controller('agent-internal/agents')
@UseGuards(AgentMtlsGuard, AgentInternalGuard)
export class WhatsAppAgentInternalController {
  constructor(
    private readonly whatsappAgentInternalService: WhatsAppAgentInternalService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: "Baca status internal lengkap agent",
    description:
      'Endpoint internal backend, dipanggil oleh whatsapp-agent untuk mengambil objek WhatsAppAgent lengkap (cache lokal di sisi agent) dan grup manajemen terkait.',
  })
  @ApiResponse({
    status: 200,
    description: "Snapshot lengkap agent dikembalikan",
  })
  @ApiResponse({
    status: 401,
    description: 'JWT antar-layanan tidak valid atau tidak ada',
  })
  async getAgentSnapshot(@AgentContext() context: AgentRequestContext) {
    return this.whatsappAgentInternalService.getAgentSnapshot(
      context.agentId,
      context.userId,
    );
  }

  @Patch('me')
  @ApiOperation({
    summary: "Perbarui status internal agent",
    description:
      'Endpoint internal backend tunggal untuk pembaruan yang datang dari whatsapp-agent. Semua properti bersifat opsional (prompt, status sync gambar, error sync).',
  })
  @ApiResponse({
    status: 200,
    description: 'Snapshot agent diperbarui dan dikembalikan',
  })
  @ApiResponse({
    status: 401,
    description: 'JWT antar-layanan tidak valid atau tidak ada',
  })
  async updateAgentSnapshot(
    @AgentContext() context: AgentRequestContext,
    @Body() dto: UpdateAgentInternalDto,
  ) {
    return this.whatsappAgentInternalService.updateAgentSnapshot(
      context.agentId,
      context.userId,
      dto,
    );
  }
}
