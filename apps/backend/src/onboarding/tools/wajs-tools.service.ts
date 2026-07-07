import { ConnectorClientService } from '@app/connector-client/connector-client.service';
import {
  PageScriptService,
  ScriptVariables,
} from '@app/page-scripts/page-script.service';
import { PrismaService } from '@app/prisma/prisma.service';
import { WhatsAppAgentService } from '@app/whatsapp-agent/whatsapp-agent.service';
import { Injectable, Logger } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';

import { AgentContext } from '../types/context.types';

/**
 * Type for script execution results
 */
type ScriptExecutionResult = unknown;

/**
 * Type pour le config des tools avec contexte typé
 */
type ToolConfig = {
  context?: AgentContext;
};

/**
 * Service providing wa-js tools for the AI agent
 * Executes scripts on the user's WhatsApp connector
 */
@Injectable()
export class WaJsToolsService {
  private readonly logger = new Logger(WaJsToolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pageScriptService: PageScriptService,
    private readonly connectorClientService: ConnectorClientService,
    private readonly whatsappAgentService: WhatsAppAgentService,
  ) {}

  /**
   * Execute a wa-js script on the user's connector
   */
  private async executeScript(
    userId: string,
    scriptPath: string,
    variables: ScriptVariables = {},
  ): Promise<ScriptExecutionResult> {
    const agent = await this.prisma.whatsAppAgent.findFirst({
      where: { userId },
    });

    if (!agent) {
      throw new Error('WhatsApp agent not found for user');
    }

    // Get connector URL
    const connectorUrl = await this.whatsappAgentService.getConnectorUrl(agent);

    // Generate script with variables
    const script = this.pageScriptService.getScript(scriptPath, variables);

    // Execute on connector
    return await this.connectorClientService.executeScript(
      connectorUrl,
      script,
      { targetInstanceId: agent.stackLabel || agent.id },
    );
  }

  /**
   * Create all wa-js tools (userId accessed via runtime context)
   */
  createTools(): ReturnType<typeof tool>[] {
    return [
      // Labels tools
      ...this.createLabelTools(),
      // Chat tools
      ...this.createChatTools(),
      // Contact tools
      ...this.createContactTools(),
      // Group tools
      ...this.createGroupTools(),
      // Profile tools
      ...this.createProfileTools(),
      // Catalog tools
      ...this.createCatalogTools(),
    ];
  }

  // ========== LABELS TOOLS ==========

  private createLabelTools(): ReturnType<typeof tool>[] {
    return [
      tool(
        async (_, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(
            userId,
            'labels/getAllLabels',
          );
          return JSON.stringify(result);
        },
        {
          name: 'getAllLabels',
          description: 'Ambil semua label WhatsApp',
          schema: z.object({}),
        },
      ),

      tool(
        async ({ name, color }, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(
            userId,
            'labels/addNewLabel',
            {
              LABEL_NAME: name,
              LABEL_COLOR: color || '#4CAF50',
            },
          );
          return JSON.stringify(result);
        },
        {
          name: 'addNewLabel',
          description: 'Buat label WhatsApp baru',
          schema: z.object({
            name: z.string().describe('Nama label'),
            color: z.string().optional().describe('Warna hex (cth: #4CAF50)'),
          }),
        },
      ),

      tool(
        async ({ labelId, name, color }, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(userId, 'labels/editLabel', {
            LABEL_ID: labelId,
            LABEL_NAME: name,
            LABEL_COLOR: color || '',
          });
          return JSON.stringify(result);
        },
        {
          name: 'editLabel',
          description: 'Ubah label yang ada',
          schema: z.object({
            labelId: z.string().describe('ID label'),
            name: z.string().describe('Nama baru'),
            color: z.string().optional().describe('Warna hex baru'),
          }),
        },
      ),

      tool(
        async ({ labelId }, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(
            userId,
            'labels/deleteLabel',
            {
              LABEL_ID: labelId,
            },
          );
          return JSON.stringify(result);
        },
        {
          name: 'deleteLabel',
          description: 'Hapus label',
          schema: z.object({
            labelId: z.string().describe('ID label yang akan dihapus'),
          }),
        },
      ),

      tool(
        async ({ chatId, labelIds, action }, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(
            userId,
            'labels/addOrRemoveLabels',
            {
              CHAT_ID: chatId,
              LABEL_IDS: JSON.stringify(labelIds),
              ACTION: action,
            },
          );
          return JSON.stringify(result);
        },
        {
          name: 'addOrRemoveLabels',
          description: "Tambah atau hapus label dari percakapan",
          schema: z.object({
            chatId: z.string().describe('ID percakapan'),
            labelIds: z.array(z.string()).describe('ID label'),
            action: z.enum(['add', 'remove']).describe('Aksi yang akan dilakukan'),
          }),
        },
      ),
    ];
  }

  // ========== CHAT TOOLS ==========

  private createChatTools(): ReturnType<typeof tool>[] {
    return [
      tool(
        async ({ chatId, limit }, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(userId, 'chat/getMessages', {
            CHAT_ID: chatId,
            LIMIT: String(limit || 20),
          });
          return JSON.stringify(result);
        },
        {
          name: 'getMessages',
          description: "Baca pesan dari percakapan",
          schema: z.object({
            chatId: z.string().describe('ID percakapan'),
            limit: z.number().optional().describe('Jumlah pesan'),
          }),
        },
      ),

      tool(
        async ({ chatId }, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(userId, 'chat/markIsRead', {
            CHAT_ID: chatId,
          });
          return JSON.stringify(result);
        },
        {
          name: 'markIsRead',
          description: 'Tandai percakapan sebagai dibaca',
          schema: z.object({
            chatId: z.string().describe('ID percakapan'),
          }),
        },
      ),
    ];
  }

  // ========== CONTACT TOOLS ==========

  private createContactTools(): ReturnType<typeof tool>[] {
    return [
      tool(
        async ({ contactId }, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(
            userId,
            'contact/getContact',
            {
              CONTACT_ID: contactId,
            },
          );
          return JSON.stringify(result);
        },
        {
          name: 'getContact',
          description: "Dapatkan informasi kontak",
          schema: z.object({
            contactId: z.string().describe('ID kontak'),
          }),
        },
      ),

      tool(
        async (
          { onlyMyContacts, withLabels, name, limit },
          config: ToolConfig,
        ) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(
            userId,
            'contact/getContactList',
            {
              ONLY_MY_CONTACTS:
                onlyMyContacts !== undefined ? String(onlyMyContacts) : 'true',
              WITH_LABELS: withLabels ? JSON.stringify(withLabels) : '',
              NAME: name || '',
              LIMIT: String(limit || 10),
            },
          );
          return JSON.stringify(result);
        },
        {
          name: 'getContactList',
          description:
            'Dapatkan daftar kontak (maks 10). Filter tersedia: onlyMyContacts, withLabels, name (pencarian berdasarkan nama)',
          schema: z.object({
            onlyMyContacts: z
              .boolean()
              .optional()
              .describe('Hanya kontak saya (default: true)'),
            withLabels: z
              .array(z.string())
              .optional()
              .describe('Filter berdasarkan label (nama atau ID)'),
            name: z
              .string()
              .optional()
              .describe('Cari kontak berdasarkan nama'),
            limit: z
              .number()
              .optional()
              .describe('Jumlah maks hasil (maks 10, default: 10)'),
          }),
        },
      ),

      tool(
        async ({ phoneNumber }, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(
            userId,
            'contact/queryContactExists',
            { PHONE_NUMBER: phoneNumber },
          );
          return JSON.stringify(result);
        },
        {
          name: 'queryContactExists',
          description: 'Periksa apakah nomor ada di WhatsApp',
          schema: z.object({
            phoneNumber: z.string().describe('Nomor telepon'),
          }),
        },
      ),
    ];
  }

  // ========== GROUP TOOLS ==========

  private createGroupTools(): ReturnType<typeof tool>[] {
    return [
      tool(
        async (_, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(userId, 'group/getAllGroups');
          return JSON.stringify(result);
        },
        {
          name: 'getAllGroups',
          description: 'Ambil semua grup WhatsApp',
          schema: z.object({}),
        },
      ),

      tool(
        async ({ name, participants }, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(userId, 'group/createGroup', {
            GROUP_NAME: name,
            PARTICIPANTS: JSON.stringify(participants),
          });
          return JSON.stringify(result);
        },
        {
          name: 'createGroup',
          description: 'Buat grup WhatsApp baru',
          schema: z.object({
            name: z.string().describe('Nama grup'),
            participants: z
              .array(z.string())
              .describe('Nomor peserta'),
          }),
        },
      ),
    ];
  }

  // ========== PROFILE TOOLS ==========

  private createProfileTools(): ReturnType<typeof tool>[] {
    return [
      tool(
        async (_, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(
            userId,
            'profile/getMyProfileName',
          );
          return JSON.stringify(result);
        },
        {
          name: 'getMyProfileName',
          description: 'Dapatkan nama profil WhatsApp',
          schema: z.object({}),
        },
      ),

      tool(
        async ({ name }, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(
            userId,
            'profile/setMyProfileName',
            { PROFILE_NAME: name },
          );
          return JSON.stringify(result);
        },
        {
          name: 'setMyProfileName',
          description: 'Ubah nama profil WhatsApp',
          schema: z.object({
            name: z.string().describe('Nama baru'),
          }),
        },
      ),
    ];
  }

  // ========== CATALOG TOOLS ==========

  private createCatalogTools(): ReturnType<typeof tool>[] {
    return [
      tool(
        async (_, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(
            userId,
            'catalog/getCollections',
          );
          return JSON.stringify(result);
        },
        {
          name: 'getCollections',
          description: 'Ambil semua koleksi katalog WhatsApp',
          schema: z.object({}),
        },
      ),

      tool(
        async ({ collectionId }, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(
            userId,
            'catalog/getProductsFromCollection',
            {
              COLLECTION_ID: collectionId,
            },
          );
          return JSON.stringify(result);
        },
        {
          name: 'getProductsFromCollection',
          description: "Ambil produk dari koleksi tertentu",
          schema: z.object({
            collectionId: z.string().describe('ID koleksi'),
          }),
        },
      ),

      tool(
        async ({ productId, visible }, config: ToolConfig) => {
          const userId = config?.context?.userId;
          if (!userId) {
            throw new Error('userId not found in runtime context');
          }
          const result = await this.executeScript(
            userId,
            'catalog/setProductVisibility',
            {
              PRODUCT_ID: productId,
              VISIBLE: String(visible),
            },
          );
          return JSON.stringify(result);
        },
        {
          name: 'setProductVisibility',
          description: 'Tampilkan atau sembunyikan produk',
          schema: z.object({
            productId: z.string().describe('ID produk'),
            visible: z.boolean().describe('Tampak atau tidak'),
          }),
        },
      ),
    ];
  }
}
