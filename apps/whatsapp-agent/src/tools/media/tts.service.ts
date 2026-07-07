import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface TtsResult {
  audioBuffer: Buffer;
  mimeType: string;
  model: string;
}

/**
 * Text-to-Speech service using OpenAI-compatible endpoints.
 *
 * Works with router9's /v1/audio/speech endpoint, supporting models like:
 *   - edge-tts/id-ID-ArdiNeural (Indonesian male voice)
 *   - edge-tts/id-ID-GadisNeural (Indonesian female voice)
 *   - openrouter/openai/tts-1-hd
 *   - openrouter/openai/gpt-4o-mini-tts
 *
 * Also compatible with OpenAI's native /v1/audio/speech endpoint.
 */
@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultVoice: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.baseUrl =
      this.configService.get<string>('OPENAI_API_BASE_URL') || '';
    this.defaultModel =
      this.configService.get<string>('OPENAI_TTS_MODEL')?.trim() ||
      'edge-tts/id-ID-ArdiNeural';
    this.defaultVoice =
      this.configService.get<string>('OPENAI_TTS_VOICE')?.trim() || '';

    if (this.apiKey && this.baseUrl) {
      this.logger.log(
        `TTS service initialized — model: ${this.defaultModel}, baseURL: ${this.baseUrl}`,
      );
    } else {
      this.logger.warn(
        'TTS service not configured — set OPENAI_API_KEY + OPENAI_API_BASE_URL to enable voice notes',
      );
    }
  }

  isAvailable(): boolean {
    return !!(this.apiKey && this.baseUrl);
  }

  /**
   * Synthesize speech from text.
   * @param text - The text to convert to speech (max ~4096 chars recommended)
   * @param options - Optional model and voice overrides
   * @returns TtsResult with audio buffer and metadata
   */
  async synthesize(
    text: string,
    options?: { model?: string; voice?: string },
  ): Promise<TtsResult> {
    if (!this.isAvailable()) {
      throw new Error(
        'TTS service not configured — set OPENAI_API_KEY + OPENAI_API_BASE_URL',
      );
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for TTS');
    }

    // Truncate very long text to avoid API limits
    const truncatedText =
      text.length > 4096 ? text.substring(0, 4096) : text;

    const model = options?.model || this.defaultModel;
    const voice = options?.voice || this.defaultVoice;

    this.logger.debug(
      `Synthesizing speech — model: ${model}, text length: ${truncatedText.length}`,
    );

    const requestBody: Record<string, unknown> = {
      model,
      input: truncatedText,
    };

    // Some TTS models require a voice field, others (like edge-tts) don't
    if (voice) {
      requestBody.voice = voice;
    }

    const response = await axios.post(
      `${this.baseUrl}/audio/speech`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        responseType: 'arraybuffer',
        timeout: 30000,
      },
    );

    if (response.status !== 200) {
      throw new Error(
        `TTS API returned status ${response.status}: ${response.statusText}`,
      );
    }

    const audioBuffer = Buffer.from(response.data);
    const mimeType =
      (response.headers['content-type'] as string) || 'audio/mp3';

    this.logger.debug(
      `TTS synthesis complete — ${audioBuffer.length} bytes, type: ${mimeType}`,
    );

    return {
      audioBuffer,
      mimeType,
      model,
    };
  }
}
