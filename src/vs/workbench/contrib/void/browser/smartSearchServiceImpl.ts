/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExtensionService } from '../../../../workbench/services/extensions/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ISmartSearchService, SearchResult, SmartSearchQuery } from '../common/smartSearchService.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';

const GOOGLE_API_ENDPOINT = 'https://www.googleapis.com/customsearch/v1';
const RESULTS_PER_PAGE = 10;
const MAX_RESULTS = 20;

export class SmartSearchService extends Disposable implements ISmartSearchService {
    declare readonly _serviceBrand: undefined;

    private readonly apiKey: string = 'AIzaSyCPR3fFs89C3KoUqlfQ3D7fuY_qE6QMtq8';
    private readonly searchEngineId: string = 'b5c87db0a2743426b';
    private readonly resultsCache = new Map<string, SearchResult[]>();

    constructor(
        @IConfigurationService private readonly configService: IConfigurationService,
        @ILogService private readonly logService: ILogService,
        @IFileService private readonly fileService: IFileService,
        @IExtensionService private readonly extensionService: IExtensionService
    ) {
        super();
    }

    async generateSmartQuery(userInput: string, context?: string): Promise<SmartSearchQuery> {
        // Use AI to generate an optimized search query
        const prompt = `Given the user query "${userInput}" ${context ? `and context "${context}"` : ''},
        generate an optimized search query focusing on programming-related results.
        Consider:
        1. Technical specificity
        2. Common programming terms
        3. Framework/language context
        4. Error message patterns
        5. Documentation sources`;

        // TODO: Use void's AI service to generate the query
        // For now, return a basic enhanced query
        const enhancedQuery = `${userInput} programming code example documentation`;

        return {
            query: enhancedQuery,
            context: context || '',
            intent: this.detectSearchIntent(userInput),
            filters: this.extractSearchFilters(userInput)
        };
    }

    async searchGoogle(query: SmartSearchQuery, page: number): Promise<SearchResult[]> {
        const cacheKey = `${query.query}_${page}`;
        const cached = this.resultsCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const start = (page - 1) * RESULTS_PER_PAGE + 1;
            const url = new URL(GOOGLE_API_ENDPOINT);
            url.searchParams.append('key', this.apiKey);
            url.searchParams.append('cx', this.searchEngineId);
            url.searchParams.append('q', query.query);
            url.searchParams.append('start', start.toString());
            url.searchParams.append('num', RESULTS_PER_PAGE.toString());

            // Add filters if available
            if (query.filters?.language) {
                url.searchParams.append('lr', `lang_${query.filters.language}`);
            }
            if (query.filters?.timeframe) {
                url.searchParams.append('dateRestrict', query.filters.timeframe);
            }

            const response = await fetch(url.toString());
            const data = await response.json();

            if (!response.ok) {
                throw new Error(`Google search failed: ${data.error?.message || response.statusText}`);
            }

            const results: SearchResult[] = data.items?.map((item: any) => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet,
                pagemap: item.pagemap
            })) || [];

            // Cache results
            this.resultsCache.set(cacheKey, results);
            return results;

        } catch (error) {
            this.logService.error('[SmartSearchService] Search error:', error);
            throw error;
        }
    }

    async extractContent(results: SearchResult[]): Promise<{
        title: string;
        content: string;
        type: 'text' | 'code' | 'mixed';
        relevance: number;
        source: string;
    }[]> {
        try {
            const puppeteer = await import('puppeteer');
            const browser = await puppeteer.launch({ headless: true });
            const extractedResults = [];

            for (const result of results) {
                try {
                    const page = await browser.newPage();
                    await page.goto(result.link, { waitUntil: 'networkidle0', timeout: 10000 });

                    const content = await page.evaluate(() => {
                        // Extract main content
                        const article = document.querySelector('article') || document.querySelector('main') || document.body;
                        const codeBlocks = Array.from(article.querySelectorAll('pre, code')).map(el => el.textContent);
                        const text = article.textContent;

                        return {
                            text: text?.slice(0, 5000), // Limit text length
                            code: codeBlocks
                        };
                    });

                    const type = content.code.length > 0 ? (content.text ? 'mixed' : 'code') : 'text';
                    const relevance = this.calculateRelevance(content, result.title);

                    extractedResults.push({
                        title: result.title,
                        content: type === 'code' ? content.code.join('\n\n') : content.text,
                        type,
                        relevance,
                        source: result.link
                    });

                    await page.close();
                } catch (error) {
                    this.logService.warn(`Failed to extract content from ${result.link}:`, error);
                }
            }

            await browser.close();
            return extractedResults.sort((a, b) => b.relevance - a.relevance);

        } catch (error) {
            this.logService.error('[SmartSearchService] Content extraction error:', error);
            throw error;
        }
    }

    private detectSearchIntent(query: string): SmartSearchQuery['intent'] {
        if (query.includes('documentation') || query.includes('docs') || query.includes('api')) {
            return 'documentation';
        }
        if (query.includes('example') || query.includes('sample') || query.includes('how to')) {
            return 'example';
        }
        if (query.includes('tutorial') || query.includes('guide') || query.includes('learn')) {
            return 'tutorial';
        }
        if (query.includes('error') || query.includes('fix') || query.includes('solve')) {
            return 'solution';
        }
        return 'general';
    }

    private extractSearchFilters(query: string): SmartSearchQuery['filters'] {
        const filters: SmartSearchQuery['filters'] = {};

        // Extract language
        const langMatch = query.match(/\b(javascript|typescript|python|java|c\+\+|ruby|go|rust)\b/i);
        if (langMatch) {
            filters.language = langMatch[1].toLowerCase();
        }

        // Extract timeframe
        if (query.includes('last year')) {
            filters.timeframe = 'y1';
        } else if (query.includes('last month')) {
            filters.timeframe = 'm1';
        } else if (query.includes('last week')) {
            filters.timeframe = 'w1';
        }

        return filters;
    }

    private calculateRelevance(content: { text: string; code: string[] }, title: string): number {
        let score = 0;

        // Boost for code examples
        score += content.code.length * 2;

        // Boost for comprehensive text
        if (content.text && content.text.length > 1000) {
            score += 3;
        }

        // Boost for likely documentation
        if (title.toLowerCase().includes('documentation') ||
            title.toLowerCase().includes('guide') ||
            title.toLowerCase().includes('reference')) {
            score += 2;
        }

        return score;
    }
}

registerSingleton(ISmartSearchService, SmartSearchService);
