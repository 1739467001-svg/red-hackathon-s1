import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Semaphore } from '../../common/semaphore';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private cache = new Map<string, string>();
  private readonly semaphore: Semaphore;
  private readonly timeoutMs: number;
  private readonly cacheMaxSize: number;
  private readonly resultsCount: number;

  constructor(private configService: ConfigService) {
    this.semaphore = new Semaphore(
      this.configService.get<number>('SEARCH_MAX_CONCURRENT', 3),
    );
    this.timeoutMs = this.configService.get<number>('SEARCH_TIMEOUT_MS', 10000);
    this.cacheMaxSize = this.configService.get<number>(
      'SEARCH_CACHE_MAX_SIZE',
      100,
    );
    this.resultsCount = this.configService.get<number>(
      'SEARCH_RESULTS_COUNT',
      5,
    );
  }

  async search(query: string): Promise<string> {
    const cached = this.cache.get(query);
    if (cached) return cached;

    await this.semaphore.acquire();
    try {
      const result = await this.fetchResults(query);
      this.cache.set(query, result);
      if (this.cache.size > this.cacheMaxSize) {
        const firstKey = this.cache.keys().next().value as string | undefined;
        if (firstKey) this.cache.delete(firstKey);
      }
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Search failed for "${query}": ${message}`);
      return `搜索"${query}"失败，请基于已有知识继续。`;
    } finally {
      this.semaphore.release();
    }
  }

  private async fetchResults(query: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const html = await response.text();
      return this.parseResults(html);
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResults(html: string): string {
    const results: string[] = [];

    // Extract result blocks using regex on DuckDuckGo HTML structure
    // Each result has a title in <a class="result__a"> and snippet in <a class="result__snippet">
    const titleRegex = /<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex =
      /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    const titles: string[] = [];
    const snippets: string[] = [];

    let match: RegExpExecArray | null;
    while ((match = titleRegex.exec(html)) !== null) {
      titles.push(this.stripHtml(match[1]).trim());
    }
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(this.stripHtml(match[1]).trim());
    }

    const count = Math.min(this.resultsCount, titles.length);
    for (let i = 0; i < count; i++) {
      const title = titles[i] || '';
      const snippet = snippets[i] || '';
      if (title || snippet) {
        results.push(`${i + 1}. ${title}\n   ${snippet}`);
      }
    }

    if (results.length === 0) {
      return '未找到相关搜索结果。';
    }

    return results.join('\n\n');
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ');
  }
}
