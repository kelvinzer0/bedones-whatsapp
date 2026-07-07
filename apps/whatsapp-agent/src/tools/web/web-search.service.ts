import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  displayUrl?: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  model: string;
}

/**
 * Web search service using OpenAI-compatible endpoints.
 *
 * Works with router9's /v1/search endpoint, supporting:
 *   - tavily/search (web search via Tavily API)
 *
 * Also compatible with any OpenAI-compatible search endpoint.
 */
@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.baseUrl =
      this.configService.get<string>('OPENAI_API_BASE_URL') || '';
    this.defaultModel =
      this.configService.get<string>('OPENAI_SEARCH_MODEL')?.trim() ||
      'tavily';

    if (this.apiKey && this.baseUrl) {
      this.logger.log(
        `Web search service initialized — model: ${this.defaultModel}, baseURL: ${this.baseUrl}`,
      );
    } else {
      this.logger.warn(
        'Web search service not configured — set OPENAI_API_KEY + OPENAI_API_BASE_URL to enable web search',
      );
    }
  }

  isAvailable(): boolean {
    return !!(this.apiKey && this.baseUrl);
  }

  /**
   * Search the web for real-time information.
   * @param query - The search query
   * @param options - Optional maxResults (default 5)
   * @returns WebSearchResponse with search results
   */
  async search(
    query: string,
    options?: { maxResults?: number },
  ): Promise<WebSearchResponse> {
    if (!this.isAvailable()) {
      throw new Error(
        'Web search service not configured — set OPENAI_API_KEY + OPENAI_API_BASE_URL',
      );
    }

    if (!query || query.trim().length === 0) {
      throw new Error('Query is required for web search');
    }

    const maxResults = options?.maxResults || 5;

    this.logger.debug(
      `Searching web — query: "${query}", maxResults: ${maxResults}`,
    );

    const response = await axios.post(
      `${this.baseUrl}/search`,
      {
        model: this.defaultModel,
        query,
        search_type: 'web',
        max_results: maxResults,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 30000,
      },
    );

    if (response.status !== 200) {
      throw new Error(
        `Web search API returned status ${response.status}: ${response.statusText}`,
      );
    }

    const data = response.data;
    const results: WebSearchResult[] = (data.results || []).map(
      (r: any) => ({
        title: r.title || '',
        url: r.url || '',
        snippet: r.snippet || r.content || '',
        displayUrl: r.display_url,
      }),
    );

    this.logger.debug(
      `Web search complete — ${results.length} results for "${query}"`,
    );

    return {
      query,
      results,
      model: this.defaultModel,
    };
  }
}
