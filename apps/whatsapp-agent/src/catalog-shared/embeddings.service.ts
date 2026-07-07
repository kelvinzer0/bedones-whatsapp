import { Embeddings } from '@langchain/core/embeddings';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service for generating text embeddings.
 *
 * Supports two providers (priority order):
 *   1. OpenAI-compatible (when OPENAI_API_BASE_URL + OPENAI_API_KEY are set)
 *      — works with OpenAI, Azure, custom proxies like router9.
 *   2. Gemini (when GEMINI_API_KEY is set) — uses Google's text-embedding-004.
 *
 * IMPORTANT: Switching providers changes vector dimensions, so the Qdrant
 * collection must be recreated (POST /image-processing/reset-qdrant).
 *
 * This service is ONLY used for:
 * - Generating query embeddings for vector search in Qdrant
 * - Product embeddings are generated and stored ONLY in Qdrant (not in database)
 *
 * Database storage of embeddings (CatalogProduct.embedding) is deprecated.
 * All embeddings are now stored in Qdrant collections.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private embeddings: Embeddings | null = null;
  private activeProvider: 'openai' | 'gemini' | null = null;
  private activeModelName: string | null = null;

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    // Try OpenAI-compatible first (router9, OpenAI, Azure, etc.)
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    const openaiBaseUrl =
      this.configService.get<string>('OPENAI_API_BASE_URL') || '';
    const openaiEmbeddingModel =
      this.configService.get<string>('OPENAI_EMBEDDING_MODEL')?.trim() ||
      'text-embedding-3-large';

    if (openaiApiKey && openaiBaseUrl) {
      try {
        this.embeddings = new OpenAIEmbeddings({
          apiKey: openaiApiKey,
          model: openaiEmbeddingModel,
          configuration: { baseURL: openaiBaseUrl },
        });
        this.activeProvider = 'openai';
        this.activeModelName = openaiEmbeddingModel;
        this.logger.log(
          `Using OpenAI-compatible embeddings — model: ${openaiEmbeddingModel}, baseURL: ${openaiBaseUrl}`,
        );
        return;
      } catch (error) {
        this.logger.warn(
          `Failed to init OpenAI-compatible embeddings: ${error.message}. Trying Gemini fallback...`,
        );
      }
    }

    // Fallback to Gemini
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    const geminiModel =
      this.configService.get<string>('GEMINI_EMBEDDING_MODEL')?.trim() ||
      'text-embedding-004';

    if (geminiApiKey) {
      try {
        this.embeddings = new GoogleGenerativeAIEmbeddings({
          apiKey: geminiApiKey,
          modelName: geminiModel,
        });
        this.activeProvider = 'gemini';
        this.activeModelName = geminiModel;
        this.logger.log(
          `Using Gemini embeddings — model: ${geminiModel}`,
        );
        return;
      } catch (error) {
        this.logger.error(
          `Failed to init Gemini embeddings: ${error.message}`,
        );
      }
    }

    this.logger.warn(
      'No embeddings provider configured — semantic search will be disabled. ' +
        'Set OPENAI_API_KEY + OPENAI_API_BASE_URL, or GEMINI_API_KEY to enable.',
    );
  }

  /**
   * Check if embeddings are available
   */
  isAvailable(): boolean {
    return !!this.embeddings;
  }

  /**
   * Get the active provider name (for logging/debugging)
   */
  getProvider(): 'openai' | 'gemini' | null {
    return this.activeProvider;
  }

  /**
   * Get the active model name
   */
  getModelName(): string | null {
    return this.activeModelName;
  }

  /**
   * Generate embedding for a single text
   */
  async embedText(text: string): Promise<number[]> {
    if (!this.embeddings) {
      throw new Error(
        'Embeddings service not configured — set OPENAI_API_KEY + OPENAI_API_BASE_URL or GEMINI_API_KEY',
      );
    }
    return this.embeddings.embedQuery(text);
  }

  /**
   * Generate embeddings for multiple texts in batch
   * More efficient than calling embedText multiple times
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    if (!this.embeddings) {
      throw new Error(
        'Embeddings service not configured — set OPENAI_API_KEY + OPENAI_API_BASE_URL or GEMINI_API_KEY',
      );
    }

    try {
      // Process in batches of 10 to avoid rate limits
      const batchSize = 10;
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const embeddings = await this.embeddings.embedDocuments(batch);
        results.push(...embeddings);

        this.logger.debug(
          `Embedded batch ${i / batchSize + 1}/${Math.ceil(texts.length / batchSize)}`,
        );
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to generate batch embeddings: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * Returns a value between -1 and 1 (higher = more similar)
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find top K most similar items based on cosine similarity
   */
  findTopK<T>(
    query: number[],
    items: Array<{ embedding: number[]; data: T }>,
    k: number = 10,
  ): Array<{ data: T; similarity: number }> {
    const scored = items.map((item) => ({
      data: item.data,
      similarity: this.cosineSimilarity(query, item.embedding),
    }));

    // Sort by similarity (descending)
    scored.sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, k);
  }
}
