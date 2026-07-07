import {
  StatusSchedule,
  StatusScheduleContentType,
  StatusScheduleState,
} from '@app/generated/client';
import * as crypto from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { MinioService } from '../minio/minio.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppAgentService } from '../whatsapp-agent/whatsapp-agent.service';

import { CreateStatusScheduleDto } from './dto/create-status-schedule.dto';
import { StatusScheduleQueryDto } from './dto/status-schedule-query.dto';
import { UpdateStatusScheduleDto } from './dto/update-status-schedule.dto';

type ScheduleInput = {
  scheduledFor: string;
  timezone: string;
  contentType: StatusScheduleContentType;
  textContent?: string | null;
  caption?: string | null;
  mediaUrl?: string | null;
};

export type StatusScheduleDaySnapshot = {
  day: string;
  schedules: StatusSchedule[];
};

export type StatusScheduleMutationResult = {
  schedule: StatusSchedule;
  affectedDays: StatusScheduleDaySnapshot[];
};

@Injectable()
export class StatusSchedulerService {
  private readonly logger = new Logger(StatusSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly whatsAppAgentService: WhatsAppAgentService,
  ) {}

  async listForUser(userId: string, query: StatusScheduleQueryDto) {
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
      throw new BadRequestException(
        'startDate harus sebelum atau sama dengan endDate',
      );
    }

    return this.prisma.statusSchedule.findMany({
      where: {
        userId,
        status: {
          not: StatusScheduleState.CANCELLED,
        },
        ...(query.startDate || query.endDate
          ? {
              scheduledDay: {
                ...(query.startDate ? { gte: query.startDate } : {}),
                ...(query.endDate ? { lte: query.endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ scheduledDay: 'asc' }, { scheduledFor: 'asc' }],
    });
  }

  async createForUser(
    userId: string,
    dto: CreateStatusScheduleDto,
  ): Promise<StatusScheduleMutationResult> {
    await this.assertUserCanSchedule(userId);
    const data = await this.buildScheduleData(userId, dto);

    const schedule = await this.prisma.statusSchedule.create({
      data: {
        userId,
        ...data,
      },
    });

    return this.buildMutationResult(userId, schedule, [schedule.scheduledDay]);
  }

  async updateForUser(
    userId: string,
    scheduleId: string,
    dto: UpdateStatusScheduleDto,
  ): Promise<StatusScheduleMutationResult> {
    const existing = await this.getOwnedSchedule(scheduleId, userId);

    if (
      existing.status === StatusScheduleState.SENT ||
      existing.status === StatusScheduleState.PROCESSING
    ) {
      throw new BadRequestException(
        'Status terjadwal ini tidak dapat lagi diedit',
      );
    }

    const data = await this.buildScheduleData(userId, {
      scheduledFor: dto.scheduledFor ?? existing.scheduledFor.toISOString(),
      timezone: dto.timezone ?? existing.timezone,
      contentType: dto.contentType ?? existing.contentType,
      textContent:
        dto.textContent !== undefined ? dto.textContent : existing.textContent,
      caption: dto.caption !== undefined ? dto.caption : existing.caption,
      mediaUrl: dto.mediaUrl !== undefined ? dto.mediaUrl : existing.mediaUrl,
    });

    const schedule = await this.prisma.statusSchedule.update({
      where: { id: scheduleId },
      data: {
        ...data,
        status: StatusScheduleState.PENDING,
        attempts: 0,
        sentAt: null,
        lastError: null,
      },
    });

    return this.buildMutationResult(userId, schedule, [
      existing.scheduledDay,
      schedule.scheduledDay,
    ]);
  }

  async cancelForUser(
    userId: string,
    scheduleId: string,
  ): Promise<StatusScheduleMutationResult> {
    const existing = await this.getOwnedSchedule(scheduleId, userId);

    if (
      existing.status === StatusScheduleState.SENT ||
      existing.status === StatusScheduleState.PROCESSING
    ) {
      throw new BadRequestException(
        'Status terjadwal ini tidak dapat lagi dibatalkan',
      );
    }

    const schedule = await this.prisma.statusSchedule.update({
      where: { id: scheduleId },
      data: {
        status: StatusScheduleState.CANCELLED,
        lastError: null,
      },
    });

    return this.buildMutationResult(userId, schedule, [existing.scheduledDay]);
  }

  async dispatchDueSchedules(batchSize = 10) {
    const dueSchedules = await this.prisma.statusSchedule.findMany({
      where: {
        status: StatusScheduleState.PENDING,
        scheduledFor: {
          lte: new Date(),
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
      take: batchSize,
    });

    let sent = 0;
    let failed = 0;

    for (const schedule of dueSchedules) {
      const claimed = await this.prisma.statusSchedule.updateMany({
        where: {
          id: schedule.id,
          status: StatusScheduleState.PENDING,
        },
        data: {
          status: StatusScheduleState.PROCESSING,
        },
      });

      if (claimed.count !== 1) {
        continue;
      }

      try {
        const normalizedMediaUrl =
          schedule.contentType === StatusScheduleContentType.TEXT
            ? null
            : await this.normalizeMediaUrl(
                schedule.userId,
                schedule.contentType,
                schedule.mediaUrl,
              );

        if (normalizedMediaUrl && normalizedMediaUrl !== schedule.mediaUrl) {
          await this.prisma.statusSchedule.update({
            where: { id: schedule.id },
            data: {
              mediaUrl: normalizedMediaUrl,
            },
          });
        }

        const result = await this.whatsAppAgentService.publishStatus(
          schedule.userId,
          {
            contentType: schedule.contentType,
            textContent: schedule.textContent,
            caption: schedule.caption,
            mediaUrl: normalizedMediaUrl,
          },
        );

        if (!result.success) {
          throw new Error(result.error || 'Publikasi status gagal');
        }

        await this.prisma.statusSchedule.update({
          where: { id: schedule.id },
          data: {
            status: StatusScheduleState.SENT,
            attempts: {
              increment: 1,
            },
            sentAt: new Date(),
            lastError: null,
          },
        });

        sent += 1;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error while publishing status';

        await this.prisma.statusSchedule.update({
          where: { id: schedule.id },
          data: {
            status: StatusScheduleState.FAILED,
            attempts: {
              increment: 1,
            },
            lastError: message,
          },
        });

        failed += 1;
        this.logger.error(
          `Failed to publish scheduled status ${schedule.id}: ${message}`,
        );
      }
    }

    return {
      queued: dueSchedules.length,
      sent,
      failed,
    };
  }

  private async assertUserCanSchedule(userId: string) {
    await this.getSchedulingContext(userId);
  }

  private async getSchedulingContext(userId: string): Promise<{
    userId: string;
    agentId: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        whatsappAgent: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    if (!user.whatsappAgent) {
      throw new BadRequestException(
        'Agent WhatsApp diperlukan sebelum menjadwalkan status',
      );
    }

    return {
      userId: user.id,
      agentId: user.whatsappAgent.id,
    };
  }

  private async getOwnedSchedule(scheduleId: string, userId: string) {
    const schedule = await this.prisma.statusSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule || schedule.userId !== userId) {
      throw new NotFoundException('Status terjadwal tidak ditemukan');
    }

    return schedule;
  }

  private async listActiveSchedulesForDay(userId: string, day: string) {
    return this.prisma.statusSchedule.findMany({
      where: {
        userId,
        scheduledDay: day,
        status: {
          not: StatusScheduleState.CANCELLED,
        },
      },
      orderBy: [{ scheduledFor: 'asc' }],
    });
  }

  private async buildMutationResult(
    userId: string,
    schedule: StatusSchedule,
    days: string[],
  ): Promise<StatusScheduleMutationResult> {
    const uniqueDays = [...new Set(days.filter(Boolean))];
    const affectedDays = await Promise.all(
      uniqueDays.map(async (day) => ({
        day,
        schedules: await this.listActiveSchedulesForDay(userId, day),
      })),
    );

    return {
      schedule,
      affectedDays,
    };
  }

  private async buildScheduleData(userId: string, input: ScheduleInput) {
    const scheduledFor = new Date(input.scheduledFor);

    if (Number.isNaN(scheduledFor.getTime())) {
      throw new BadRequestException(
        'scheduledFor harus berupa datetime ISO yang valid',
      );
    }

    if (scheduledFor.getTime() <= Date.now()) {
      throw new BadRequestException('scheduledFor harus di masa depan');
    }

    const timezone = this.normalizeTimezone(input.timezone);
    const textContent = this.normalizeOptional(input.textContent);
    const caption = this.normalizeOptional(input.caption);
    const mediaUrl = await this.normalizeMediaUrl(
      userId,
      input.contentType,
      input.mediaUrl,
    );

    if (input.contentType === StatusScheduleContentType.TEXT && !textContent) {
      throw new BadRequestException(
        'textContent wajib diisi untuk status teks',
      );
    }

    if (input.contentType !== StatusScheduleContentType.TEXT && !mediaUrl) {
      throw new BadRequestException(
        'mediaUrl wajib diisi untuk status gambar atau video',
      );
    }

    return {
      scheduledFor,
      scheduledDay: this.getDayInTimezone(scheduledFor, timezone),
      timezone,
      contentType: input.contentType,
      textContent:
        input.contentType === StatusScheduleContentType.TEXT
          ? textContent
          : null,
      caption:
        input.contentType === StatusScheduleContentType.TEXT ? null : caption,
      mediaUrl:
        input.contentType === StatusScheduleContentType.TEXT ? null : mediaUrl,
    };
  }

  private normalizeTimezone(timezone: string) {
    try {
      Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
      }).format(new Date());
      return timezone;
    } catch {
      throw new BadRequestException('timezone harus berupa zona waktu IANA yang valid');
    }
  }

  private normalizeOptional(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private async normalizeMediaUrl(
    userId: string,
    contentType: StatusScheduleContentType,
    mediaUrl?: string | null,
  ): Promise<string | null> {
    if (contentType === StatusScheduleContentType.TEXT) {
      return null;
    }

    const normalized = this.normalizeOptional(mediaUrl);
    if (!normalized) {
      return null;
    }

    if (this.isDataUrl(normalized)) {
      const parsed = this.parseDataUrl(normalized);
      const upload = await this.storeMediaBuffer(userId, {
        buffer: parsed.buffer,
        mimeType: parsed.mimeType,
      });

      if (upload.contentType !== contentType) {
        throw new BadRequestException(
          `mediaUrl harus berisi file ${contentType.toLowerCase()}`,
        );
      }

      return upload.url;
    }

    this.assertPublicMediaUrl(normalized);
    return normalized;
  }

  private isDataUrl(value: string) {
    return value.startsWith('data:');
  }

  private parseDataUrl(value: string): { mimeType: string; buffer: Buffer } {
    const match = value.match(/^data:([^;]+);base64,(.+)$/s);

    if (!match) {
      throw new BadRequestException('mediaUrl harus berupa data URL yang valid');
    }

    const [, mimeType, base64Payload] = match;

    try {
      return {
        mimeType,
        buffer: Buffer.from(base64Payload, 'base64'),
      };
    } catch {
      throw new BadRequestException('mediaUrl berisi data base64 yang tidak valid');
    }
  }

  private assertPublicMediaUrl(value: string) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new BadRequestException('mediaUrl harus berupa URL http(s) publik');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('mediaUrl harus berupa URL yang valid');
    }
  }

  private async storeMediaBuffer(
    userId: string,
    media: {
      buffer: Buffer;
      mimeType: string;
      originalFilename?: string;
    },
  ): Promise<{
    url: string;
    contentType: Exclude<StatusScheduleContentType, 'TEXT'>;
  }> {
    const { agentId } = await this.getSchedulingContext(userId);
    const resolvedContentType = this.resolveMediaContentType(media.mimeType);
    const extension = this.resolveFileExtension(
      media.mimeType,
      media.originalFilename,
    );
    const objectKey = `${agentId}/status-schedules/${resolvedContentType.toLowerCase()}/${userId}-${crypto.randomUUID()}.${extension}`;

    const result = await this.minioService.uploadBuffer(
      media.buffer,
      objectKey,
      media.mimeType,
    );

    if (!result.success || !result.url) {
      throw new BadRequestException(
        result.error || 'Tidak dapat mengunggah media story',
      );
    }

    this.logger.log(
      `Status media uploaded for user ${userId}: ${objectKey} (${media.mimeType})`,
    );

    return {
      url: result.url,
      contentType: resolvedContentType,
    };
  }

  private resolveMediaContentType(
    mimeType: string,
  ): Exclude<StatusScheduleContentType, 'TEXT'> {
    if (mimeType.startsWith('image/')) {
      return StatusScheduleContentType.IMAGE;
    }

    if (mimeType.startsWith('video/')) {
      return StatusScheduleContentType.VIDEO;
    }

    throw new BadRequestException(
      'Hanya file gambar dan video yang didukung untuk story',
    );
  }

  private resolveFileExtension(mimeType: string, originalFilename?: string) {
    const fromMime: Record<string, string> = {
      'image/gif': 'gif',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm',
    };

    if (fromMime[mimeType]) {
      return fromMime[mimeType];
    }

    const filenameExtension = originalFilename?.split('.').pop()?.trim();
    if (filenameExtension) {
      return filenameExtension.toLowerCase();
    }

    const subtype = mimeType.split('/').pop()?.trim();
    if (subtype) {
      return subtype.toLowerCase();
    }

    return 'bin';
  }

  private getDayInTimezone(date: Date, timezone: string) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new BadRequestException('Tidak dapat menghitung hari terjadwal');
    }

    return `${year}-${month}-${day}`;
  }
}
