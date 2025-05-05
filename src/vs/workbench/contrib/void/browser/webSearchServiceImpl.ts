/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IWebSearchService, WebSearchResult, WebSearchOptions, CaptureOptions } from '../../common/webSearchService.js';
import { generateUuid } from '../../../../base/common/uuid.js';

export class WebSearchService extends Disposable implements IWebSearchService {
    declare readonly _serviceBrand: undefined;

    private browserPage: any | undefined;
    private readonly resultsCache = new Map<string, WebSearchResult[]>();

    constructor(
        @ILogService private readonly logService: ILogService,
        @IFileService private readonly fileService: IFileService,
        @IStorageService private readonly storageService: IStorageService
    ) {
        super();
    }

    async search(query: string, options: WebSearchOptions): Promise<WebSearchResult[]> {
        const cacheKey = this.generateCacheKey('search', query, options);
        const cached = this.resultsCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const results: WebSearchResult[] = [];
        try {
            await this.initBrowser();

            // Search different sources based on options
            if (options.searchType === 'all' || options.searchType === 'stackoverflow') {
                const stackoverflowResults = await this.searchStackOverflow(query, options.language);
                results.push(...stackoverflowResults);
            }

            if (options.searchType === 'all' || options.searchType === 'github') {
                const githubResults = await this.searchGitHub(query, options.language);
                results.push(...githubResults);
            }

            if (options.searchType === 'all' || options.searchType === 'docs') {
                const docsResults = await this.searchDocumentation(query, options.language);
                results.push(...docsResults);
            }

            // Cache results
            this.resultsCache.set(cacheKey, results);
            return results;
        } catch (error) {
            this.logService.error('[WebSearchService] Search error:', error);
            throw error;
        } finally {
            await this.closeBrowser();
        }
    }

    async navigateAndCapture(url: string, options: CaptureOptions): Promise<WebSearchResult[]> {
        try {
            await this.initBrowser();
            await this.browserPage.goto(url, { waitUntil: 'networkidle0' });

            const results: WebSearchResult[] = [];

            // Extract content based on options
            if (options.extractors?.includes('text')) {
                const textContent = await this.extractText(options.selectors);
                results.push({
                    type: 'text',
                    content: textContent,
                    metadata: { url, timestamp: Date.now(), context: 'text-content' }
                });
            }

            if (options.extractors?.includes('code')) {
                const codeBlocks = await this.extractCode();
                results.push({
                    type: 'code',
                    content: codeBlocks,
                    metadata: { url, timestamp: Date.now(), context: 'code-blocks' }
                });
            }

            if (options.screenshot) {
                const screenshot = await this.browserPage.screenshot({ fullPage: true });
                results.push({
                    type: 'image',
                    content: screenshot,
                    metadata: { url, timestamp: Date.now(), context: 'full-page' }
                });
            }

            return results;
        } catch (error) {
            this.logService.error('[WebSearchService] Navigation error:', error);
            throw error;
        } finally {
            await this.closeBrowser();
        }
    }

    async clone(url: string): Promise<WebSearchResult[]> {
        try {
            await this.initBrowser();
            await this.browserPage.goto(url, { waitUntil: 'networkidle0' });

            const results: WebSearchResult[] = [];

            // Capture full page screenshot
            const screenshot = await this.browserPage.screenshot({ fullPage: true });
            results.push({
                type: 'image',
                content: screenshot,
                metadata: { url, timestamp: Date.now(), context: 'full-page' }
            });

            // Extract HTML and styles
            const html = await this.browserPage.content();
            const styles = await this.extractStyles();
            results.push({
                type: 'structured',
                content: { html, styles },
                metadata: { url, timestamp: Date.now(), context: 'ui-clone' }
            });

            return results;
        } catch (error) {
            this.logService.error('[WebSearchService] Clone error:', error);
            throw error;
        } finally {
            await this.closeBrowser();
        }
    }

    private async initBrowser() {
        if (!this.browserPage) {
            const puppeteer = await import('puppeteer');
            const browser = await puppeteer.launch({ headless: true });
            this.browserPage = await browser.newPage();
        }
    }

    private async closeBrowser() {
        if (this.browserPage) {
            const browser = this.browserPage.browser();
            await browser.close();
            this.browserPage = undefined;
        }
    }

    private async searchStackOverflow(query: string, language?: string): Promise<WebSearchResult[]> {
        const searchQuery = language ? `[${language}] ${query}` : query;
        await this.browserPage.goto(`https://stackoverflow.com/search?q=${encodeURIComponent(searchQuery)}`);
        // Extract results...
        return [];
    }

    private async searchGitHub(query: string, language?: string): Promise<WebSearchResult[]> {
        const searchQuery = language ? `${query} language:${language}` : query;
        await this.browserPage.goto(`https://github.com/search?q=${encodeURIComponent(searchQuery)}&type=code`);
        // Extract results...
        return [];
    }

    private async searchDocumentation(query: string, language?: string): Promise<WebSearchResult[]> {
        // Search MDN, devdocs.io, etc.
        return [];
    }

    private async extractText(selectors?: string[]): Promise<string[]> {
        if (!selectors?.length) {
            return [await this.browserPage.$eval('body', (el: any) => el.innerText)];
        }

        const texts = await Promise.all(
            selectors.map(selector =>
                this.browserPage.$eval(selector, (el: any) => el.innerText)
                    .catch(() => null)
            )
        );

        return texts.filter((text): text is string => text !== null);
    }

    private async extractCode(): Promise<string[]> {
        return this.browserPage.$$eval('pre, code', (elements: any[]) =>
            elements.map(el => el.innerText)
        );
    }

    private async extractStyles(): Promise<{[key: string]: string}> {
        return this.browserPage.evaluate(() => {
            const styles: {[key: string]: string} = {};
            document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el, i) => {
                if (el instanceof HTMLStyleElement) {
                    styles[`inline_${i}`] = el.textContent || '';
                } else if (el instanceof HTMLLinkElement) {
                    styles[`external_${i}`] = el.href;
                }
            });
            return styles;
        });
    }

    private generateCacheKey(type: string, query: string, options: any = {}): string {
        return `${type}:${query}:${JSON.stringify(options)}`;
    }
}

registerSingleton(IWebSearchService, WebSearchService);
