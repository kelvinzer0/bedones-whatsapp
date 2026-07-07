import { tool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import { instrumentTools } from '../tool-logging.util';

import { WebSearchService } from './web-search.service';

/**
 * Web search tools for the WhatsApp agent.
 * Provides real-time web search capability for answering factual questions.
 */
@Injectable()
export class WebTools {
  private readonly logger = new Logger(WebTools.name);

  constructor(private readonly webSearchService: WebSearchService) {}

  createTools() {
    const tools = [this.createSearchWebTool()];

    return instrumentTools(this.logger, WebTools.name, tools);
  }

  /**
   * Search the web for real-time information.
   *
   * Use this when:
   * - The user asks about current events, news, or real-time information
   * - You need to verify a fact or find specific information
   * - The user asks "what is" or "how does" questions about current topics
   *
   * Do NOT use for:
   * - Product information (use catalog tools)
   * - General conversation (respond directly)
   * - Questions about the business itself (use business context)
   */
  private createSearchWebTool() {
    return tool(
      async ({ query, maxResults }) => {
        try {
          if (!this.webSearchService.isAvailable()) {
            return JSON.stringify({
              success: false,
              error:
                'Web search service not configured. Set OPENAI_API_KEY + OPENAI_API_BASE_URL to enable web search.',
            });
          }

          const result = await this.webSearchService.search(query, {
            maxResults,
          });

          // Format results for the agent
          const formattedResults = result.results
            .map(
              (r, i) =>
                `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`,
            )
            .join('\n\n');

          this.logger.log(
            `Web search for "${query}" returned ${result.results.length} results`,
          );

          return JSON.stringify({
            success: true,
            query: result.query,
            resultCount: result.results.length,
            results: formattedResults,
          });
        } catch (error: any) {
          this.logger.error(`Web search failed: ${error.message}`);
          return JSON.stringify({
            success: false,
            error: error.message,
          });
        }
      },
      {
        name: 'search_web',
        description:
          'Search the web for real-time information, news, or facts. ' +
          'Use when the user asks about current events, prices, or factual questions ' +
          'that require up-to-date information not in your training data. ' +
          'Returns a list of search results with titles, URLs, and snippets.',
        schema: z.object({
          query: z
            .string()
            .describe('The search query (what to search for on the web)'),
          maxResults: z
            .number()
            .min(1)
            .max(10)
            .optional()
            .describe('Maximum number of results to return (default 5)'),
        }),
      },
    );
  }
}
