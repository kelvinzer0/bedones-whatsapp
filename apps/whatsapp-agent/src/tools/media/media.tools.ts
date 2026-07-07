import { ConnectorClientService } from '@app/connector/connector-client.service';
import { tool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import { instrumentTools } from '../tool-logging.util';

import { TtsService } from './tts.service';

/**
 * Media tools for the WhatsApp agent.
 * Currently provides text-to-speech voice note capability.
 */
@Injectable()
export class MediaTools {
  private readonly logger = new Logger(MediaTools.name);

  constructor(
    private readonly ttsService: TtsService,
    private readonly connectorClient: ConnectorClientService,
  ) {}

  createTools() {
    const tools = [this.createSendVoiceMessageTool()];

    return instrumentTools(this.logger, MediaTools.name, tools);
  }

  /**
   * Send a voice note to the current chat.
   * Converts text to speech using TTS, then sends it as a WhatsApp audio message.
   *
   * Use this when:
   * - The user asks for a voice message
   * - A more personal/human touch is needed (e.g. greetings, thank you notes)
   * - The response is short and conversational
   *
   * Do NOT use for:
   * - Long technical explanations (use text)
   * - Product information (use text with product cards)
   */
  private createSendVoiceMessageTool() {
    return tool(
      async ({ text }, config?: any) => {
        try {
          const chatId = config?.context?.chatId;
          if (!chatId) {
            return JSON.stringify({
              success: false,
              error: 'No chatId in runtime context',
            });
          }

          if (!this.ttsService.isAvailable()) {
            return JSON.stringify({
              success: false,
              error:
                'TTS service not configured. Set OPENAI_API_KEY + OPENAI_API_BASE_URL to enable voice notes.',
            });
          }

          // Limit text length for voice notes (keep them concise)
          const truncatedText =
            text.length > 500 ? text.substring(0, 500) + '...' : text;

          // Synthesize speech
          const ttsResult = await this.ttsService.synthesize(truncatedText);

          // Convert to base64 data URL for WPP.chat.sendFileMessage
          const base64 = ttsResult.audioBuffer.toString('base64');
          const dataUrl = `data:${ttsResult.mimeType};base64,${base64}`;

          // Send as voice note via connector execute-script
          // WPP.chat.sendFileMessage with type: 'audio' sends as voice note
          const script = `
            (async () => {
              const result = await WPP.chat.sendFileMessage(
                '${chatId}',
                '${dataUrl}',
                {
                  type: 'audio',
                  waitForAck: true,
                }
              );
              return { success: true, messageId: result?.id?._serialized || null };
            })()
          `;

          const result = await this.connectorClient.executeScript(script);

          this.logger.log(
            `Voice note sent to ${chatId} (${ttsResult.audioBuffer.length} bytes, model: ${ttsResult.model})`,
          );

          return JSON.stringify({
            success: true,
            message: 'Voice note sent successfully',
            audioSize: ttsResult.audioBuffer.length,
            model: ttsResult.model,
            result,
          });
        } catch (error: any) {
          this.logger.error(`Failed to send voice note: ${error.message}`);
          return JSON.stringify({
            success: false,
            error: error.message,
          });
        }
      },
      {
        name: 'send_voice_message',
        description:
          'Send a voice note (text-to-speech) to the current WhatsApp chat. ' +
          'Use for short conversational messages, greetings, or thank you notes. ' +
          'The text will be converted to Indonesian speech automatically. ' +
          'Maximum 500 characters per voice note.',
        schema: z.object({
          text: z
            .string()
            .max(500)
            .describe('The text to convert to speech and send as voice note'),
        }),
      },
    );
  }
}
