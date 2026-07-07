import { BackendClientService } from '@app/backend-client/backend-client.service';
import { PromptGeneratorService } from '@app/catalog-shared/prompt-generator.service';
import { HumanMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type VisionModel = ChatOpenAI | ChatGoogleGenerativeAI;

/**
 * Vision service for describing product images.
 *
 * Supports two providers (priority order):
 *   1. OpenAI-compatible (when OPENAI_API_KEY + OPENAI_API_BASE_URL are set)
 *      — works with router9, OpenAI, Azure, custom proxies.
 *      — uses any vision-capable chat model (e.g. gc/gemini-2.5-flash,
 *        kr/claude-haiku-4.5, int/internvl3.5-latest).
 *   2. Gemini (when GEMINI_API_KEY is set) — uses Google's vision model.
 *
 * The service accepts a Buffer and sends it as a base64 image_url in the
 * chat message content, which both OpenAI-compatible and Gemini APIs support.
 */
@Injectable()
export class GeminiVisionService {
  private readonly logger = new Logger(GeminiVisionService.name);
  private readonly visionModel: VisionModel | null;
  private readonly activeProvider: 'openai' | 'gemini' | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly backendClient: BackendClientService,
    private readonly promptGeneratorService: PromptGeneratorService,
  ) {
    // Try OpenAI-compatible first (router9, OpenAI, Azure, etc.)
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    const openaiBaseUrl =
      this.configService.get<string>('OPENAI_API_BASE_URL') || '';
    const openaiVisionModel =
      this.configService.get<string>('OPENAI_VISION_MODEL')?.trim() ||
      this.configService.get<string>('OPENAI_MODEL')?.trim() ||
      'gc/gemini-2.5-flash';

    if (openaiApiKey && openaiBaseUrl) {
      this.visionModel = new ChatOpenAI({
        openAIApiKey: openaiApiKey,
        modelName: openaiVisionModel,
        temperature: 0.1,
        maxRetries: 2,
        configuration: { baseURL: openaiBaseUrl },
      });
      this.activeProvider = 'openai';
      this.logger.log(
        `Vision using OpenAI-compatible model: ${openaiVisionModel} (baseURL: ${openaiBaseUrl})`,
      );
      return;
    }

    // Fallback to Gemini
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    const geminiVisionModel =
      this.configService.get<string>('GEMINI_VISION_MODEL')?.trim() ||
      'gemini-3-flash-preview';

    if (geminiApiKey) {
      this.visionModel = new ChatGoogleGenerativeAI({
        apiKey: geminiApiKey,
        model: geminiVisionModel,
        temperature: 0.1,
        maxRetries: 2,
      });
      this.activeProvider = 'gemini';
      this.logger.log(
        `Vision using Gemini model: ${geminiVisionModel}`,
      );
      return;
    }

    this.visionModel = null;
    this.activeProvider = null;
    this.logger.warn(
      'No vision provider configured — image analysis will be disabled. ' +
        'Set OPENAI_API_KEY + OPENAI_API_BASE_URL, or GEMINI_API_KEY to enable.',
    );
  }

  /**
   * Check if vision service is available
   */
  isAvailable(): boolean {
    return !!this.visionModel;
  }

  async describeProductImage(imageBuffer: Buffer): Promise<string> {
    if (!this.visionModel) {
      throw new Error(
        'Vision service not configured — set OPENAI_API_KEY + OPENAI_API_BASE_URL or GEMINI_API_KEY',
      );
    }

    const prompt = await this.resolveCustomPrompt();
    const base64 = imageBuffer.toString('base64');

    const result = await this.visionModel.invoke([
      new HumanMessage({
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: `data:image/jpeg;base64,${base64}`,
          },
        ],
      }),
    ]);

    const description = this.extractText(result.content).trim();

    if (!description) {
      throw new Error(
        `Vision (${this.activeProvider}) returned an empty description`,
      );
    }

    this.logger.debug(
      `Vision (${this.activeProvider}) description: ${description}`,
    );

    return description;
  }

  private async resolveCustomPrompt(): Promise<string> {
    const current = await this.backendClient.getAgentCustomPrompt();
    const existingPrompt = current?.customDescriptionPrompt?.trim();

    if (existingPrompt) {
      return existingPrompt;
    }

    this.logger.warn(
      'Custom description prompt missing, generating it on the fly',
    );

    return this.promptGeneratorService.ensureCustomPrompt();
  }

  private extractText(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    if (!Array.isArray(content)) {
      return '';
    }

    return content
      .map((chunk) => {
        if (typeof chunk === 'string') {
          return chunk;
        }

        if (
          typeof chunk === 'object' &&
          chunk !== null &&
          'text' in chunk &&
          typeof (chunk as { text?: unknown }).text === 'string'
        ) {
          return (chunk as { text: string }).text;
        }

        return '';
      })
      .join(' ')
      .trim();
  }
}
