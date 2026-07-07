import { PrismaService } from '@app/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';

import { AgentContext } from '../types/context.types';

/**
 * Type pour le config des tools avec contexte typé
 */
type ToolConfig = {
  context?: AgentContext;
};

/**
 * Service providing database tools for the AI agent
 * All tools use runtime context to access userId
 */
@Injectable()
export class DbToolsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create all database tools (userId accessed via runtime context)
   * Only for data that belongs in our DB (user, business, products, onboarding)
   * Tags/Groups/Conversations come from WaJs tools (live from WhatsApp)
   */
  createTools(): ReturnType<typeof tool>[] {
    return [
      this.createReadUserInfoTool(),
      this.createReadBusinessProfileTool(),
      this.createReadProductsTool(),
      // Tags and Groups removed - use WaJs tools instead (getAllLabels, getAllGroups)
      // BUT Groups DB tools for managing authorized groups with usage
      this.createListGroupsTool(),
      this.createAddGroupTool(),
      this.createUpdateGroupTool(),
      this.createDeleteGroupTool(),
      this.createUpdateContextTool(),
      this.createUpdateNeedsTool(),
      this.createGetContextScoreTool(),
    ];
  }

  private createReadUserInfoTool(): ReturnType<typeof tool> {
    return tool(
      async (_, config: ToolConfig) => {
        const userId = config?.context?.userId;
        if (!userId) {
          throw new Error('userId not found in runtime context');
        }

        // Use user from context if available (avoids DB query)
        const userFromContext = config?.context?.user;

        if (userFromContext) {
          // User already loaded from HTTP request, no need for DB query
          return JSON.stringify({
            id: userFromContext.id,
            phoneNumber: userFromContext.phoneNumber,
            status: userFromContext.status,
          });
        }

        // Fallback: Load from database (e.g., for performInitialEvaluation)
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            phoneNumber: true,
            status: true,
            createdAt: true, // Keep for DB query, just not in userFromContext
          },
        });
        return JSON.stringify(user);
      },
      {
        name: 'readUserInfo',
        description: "Baca informasi pengguna yang terhubung",
        schema: z.object({}),
      },
    );
  }

  private createReadBusinessProfileTool(): ReturnType<typeof tool> {
    return tool(
      async (_, config: ToolConfig) => {
        const userId = config?.context?.userId;
        if (!userId) {
          throw new Error('userId not found in runtime context');
        }
        const businessInfo = await this.prisma.businessInfo.findUnique({
          where: { user_id: userId },
        });
        return JSON.stringify(businessInfo);
      },
      {
        name: 'readBusinessProfile',
        description: 'Baca profil bisnis WhatsApp lengkap',
        schema: z.object({}),
      },
    );
  }

  private createReadProductsTool(): ReturnType<typeof tool> {
    return tool(
      async ({ limit, collectionId }, config) => {
        const userId = config?.context?.userId;
        if (!userId) {
          throw new Error('userId not found in runtime context');
        }
        const products = await this.prisma.product.findMany({
          where: {
            user_id: userId,
            ...(collectionId && { collection_id: collectionId }),
          },
          take: limit || 50,
          include: {
            metadata: true,
            collection: {
              select: { id: true, name: true },
            },
          },
        });
        return JSON.stringify(products);
      },
      {
        name: 'readProducts',
        description: 'Baca produk katalog',
        schema: z.object({
          limit: z
            .number()
            .optional()
            .describe('Jumlah maks produk (default 50)'),
          collectionId: z
            .string()
            .optional()
            .describe('Filter berdasarkan ID koleksi'),
        }),
      },
    );
  }

  // Tags and Groups tools removed - these should come from WaJs tools
  // Use getAllLabels and getAllGroups which fetch live data from WhatsApp

  private createUpdateContextTool(): ReturnType<typeof tool> {
    return tool(
      async ({ context }, config) => {
        const userId = config?.context?.userId;
        if (!userId) {
          throw new Error('userId not found in runtime context');
        }
        await this.prisma.onboardingThread.updateMany({
          where: { userId },
          data: { context },
        });
        return JSON.stringify({ success: true, message: 'Context updated' });
      },
      {
        name: 'updateContext',
        description: "Perbarui konteks agent (format Markdown)",
        schema: z.object({
          context: z.string().describe('Konteks baru dalam markdown'),
        }),
      },
    );
  }

  private createUpdateNeedsTool(): ReturnType<typeof tool> {
    return tool(
      async ({ needs }, config) => {
        const userId = config?.context?.userId;
        if (!userId) {
          throw new Error('userId not found in runtime context');
        }
        await this.prisma.onboardingThread.updateMany({
          where: { userId },
          data: { needs },
        });
        return JSON.stringify({ success: true, message: 'Needs updated' });
      },
      {
        name: 'updateNeeds',
        description: "Perbarui kebutuhan yang teridentifikasi untuk agent",
        schema: z.object({
          needs: z.array(z.string()).describe('Daftar kebutuhan'),
        }),
      },
    );
  }

  private createGetContextScoreTool(): ReturnType<typeof tool> {
    return tool(
      async (_, config: ToolConfig) => {
        const userId = config?.context?.userId;
        if (!userId) {
          throw new Error('userId not found in runtime context');
        }
        const thread = await this.prisma.onboardingThread.findFirst({
          where: { userId },
          select: { score: true },
        });
        return JSON.stringify({ score: thread?.score || 0 });
      },
      {
        name: 'getContextScore',
        description: 'Dapatkan skor konteks saat ini',
        schema: z.object({}),
      },
    );
  }

  /**
   * List all authorized groups for this user from database
   * These are groups that the user has configured to work with the agent
   */
  private createListGroupsTool(): ReturnType<typeof tool> {
    return tool(
      async (_, config: ToolConfig) => {
        const userId = config?.context?.userId;
        if (!userId) {
          throw new Error('userId not found in runtime context');
        }
        const groups = await this.prisma.group.findMany({
          where: { userId },
          select: {
            id: true,
            whatsappGroupId: true,
            name: true,
            usage: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        return JSON.stringify(groups);
      },
      {
        name: 'listAuthorizedGroups',
        description:
          'Daftar semua grup WhatsApp yang diizinkan terdaftar di database dengan penggunaannya',
        schema: z.object({}),
      },
    );
  }

  /**
   * Add a group to the authorized groups list with its usage
   */
  private createAddGroupTool(): ReturnType<typeof tool> {
    return tool(
      async ({ whatsappGroupId, name, usage }, config: ToolConfig) => {
        const userId = config?.context?.userId;
        if (!userId) {
          throw new Error('userId not found in runtime context');
        }

        // Check if group already exists for this user
        const existing = await this.prisma.group.findFirst({
          where: { userId, whatsappGroupId },
        });

        if (existing) {
          return JSON.stringify({
            success: false,
            error: 'Grup ini sudah terdaftar',
            existingGroup: existing,
          });
        }

        const group = await this.prisma.group.create({
          data: {
            userId,
            whatsappGroupId,
            name,
            usage,
          },
        });

        return JSON.stringify({
          success: true,
          message: 'Grup berhasil ditambahkan',
          group,
        });
      },
      {
        name: 'addAuthorizedGroup',
        description:
          "Tambahkan grup WhatsApp ke daftar grup yang diizinkan dengan penggunaannya (cth: 'Dukungan klien', 'Penjualan', 'Notifikasi')",
        schema: z.object({
          whatsappGroupId: z
            .string()
            .describe("ID WhatsApp grup (cth: '12345@g.us')"),
          name: z.string().describe('Nama grup'),
          usage: z
            .string()
            .describe(
              "Penggunaan grup (cth: 'Dukungan klien', 'Penjualan', 'Notifikasi')",
            ),
        }),
      },
    );
  }

  /**
   * Update the usage of an authorized group
   */
  private createUpdateGroupTool(): ReturnType<typeof tool> {
    return tool(
      async ({ groupId, name, usage }, config: ToolConfig) => {
        const userId = config?.context?.userId;
        if (!userId) {
          throw new Error('userId not found in runtime context');
        }

        // Ensure the group belongs to this user
        const group = await this.prisma.group.findFirst({
          where: { id: groupId, userId },
        });

        if (!group) {
          return JSON.stringify({
            success: false,
            error: 'Grup tidak ditemukan atau tidak diizinkan',
          });
        }

        const updated = await this.prisma.group.update({
          where: { id: groupId },
          data: {
            ...(name && { name }),
            ...(usage && { usage }),
          },
        });

        return JSON.stringify({
          success: true,
          message: 'Grup berhasil diperbarui',
          group: updated,
        });
      },
      {
        name: 'updateAuthorizedGroup',
        description: "Ubah nama atau penggunaan grup yang diizinkan",
        schema: z.object({
          groupId: z.string().describe('ID grup di database'),
          name: z.string().optional().describe('Nama grup baru'),
          usage: z.string().optional().describe('Penggunaan grup baru'),
        }),
      },
    );
  }

  /**
   * Delete an authorized group
   */
  private createDeleteGroupTool(): ReturnType<typeof tool> {
    return tool(
      async ({ groupId }, config: ToolConfig) => {
        const userId = config?.context?.userId;
        if (!userId) {
          throw new Error('userId not found in runtime context');
        }

        // Ensure the group belongs to this user
        const group = await this.prisma.group.findFirst({
          where: { id: groupId, userId },
        });

        if (!group) {
          return JSON.stringify({
            success: false,
            error: 'Grup tidak ditemukan atau tidak diizinkan',
          });
        }

        await this.prisma.group.delete({
          where: { id: groupId },
        });

        return JSON.stringify({
          success: true,
          message: 'Grup berhasil dihapus',
        });
      },
      {
        name: 'deleteAuthorizedGroup',
        description: 'Hapus grup dari daftar grup yang diizinkan',
        schema: z.object({
          groupId: z.string().describe('ID grup di database'),
        }),
      },
    );
  }
}
