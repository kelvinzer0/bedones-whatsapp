import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

import { PrismaService } from '../../prisma/prisma.service';

export interface AgentRequestContext {
  agentId: string;
  userId: string;
}

interface AgentInternalJwtPayload {
  sub: string;
  type: 'agent-internal';
  iat?: number;
  exp?: number;
}

@Injectable()
export class AgentInternalGuard implements CanActivate {
  private readonly logger = new Logger(AgentInternalGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { agentContext?: AgentRequestContext }>();

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token tidak ada atau tidak valid');
    }

    const token = authHeader.substring(7);
    const secret = this.configService.get<string>('AGENT_INTERNAL_JWT_SECRET');

    if (!secret) {
      this.logger.error('AGENT_INTERNAL_JWT_SECRET not configured');
      throw new UnauthorizedException('Autentikasi internal tidak dikonfigurasi');
    }

    try {
      const payload = jwt.verify(token, secret) as AgentInternalJwtPayload;

      if (payload.type !== 'agent-internal') {
        throw new UnauthorizedException('Tipe token tidak valid');
      }

      if (!payload.sub) {
        throw new UnauthorizedException('Token tidak memiliki agent id');
      }

      const agent = await this.prisma.whatsAppAgent.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          userId: true,
          status: true,
        },
      });

      if (!agent || !agent.userId) {
        throw new UnauthorizedException('Agent tidak dikenal');
      }

      if (agent.status === 'DELETED') {
        throw new UnauthorizedException('Agent telah dihapus');
      }

      request.agentContext = {
        agentId: agent.id,
        userId: agent.userId,
      };

      return true;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token kedaluwarsa');
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Token tidak valid');
      }

      this.logger.error(
        `Internal token verification failed: ${error?.message || error}`,
      );
      throw new UnauthorizedException('Verifikasi token gagal');
    }
  }
}
