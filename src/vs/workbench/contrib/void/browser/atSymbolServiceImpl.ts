/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { AtSymbolContext, IAtSymbolService, findAtSymbolMatches, formatContextReference } from '../common/atSymbolService.js';
import { IWebSearchService } from '../common/webSearchService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { FileExplorerSymbolProvider } from './fileExplorerSymbolProvider.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import type { Browser, Page } from 'puppeteer';

interface ScrapedContent {
    title: string;
    description: string;
    text: string | null;
    code: string[];
}

export class AtSymbolService implements IAtSymbolService {
    declare readonly _serviceBrand: undefined;

    private readonly linkContextCache = new Map<string, AtSymbolContext>();
    private readonly fileExplorerProvider: FileExplorerSymbolProvider;
    private browser: Browser | null = null;

    constructor(
        @IFileService private readonly fileService: IFileService,
        @IWebSearchService private readonly webSearchService: IWebSearchService,
        @ILogService private readonly logService: ILogService,
        @ILabelService labelService: ILabelService,
        @IModelService modelService: IModelService,
        @IWorkspaceContextService workspaceContextService: IWorkspaceContextService,
    ) {
        this.fileExplorerProvider = new FileExplorerSymbolProvider(
            fileService,
            labelService,
            modelService,
            workspaceContextService
        );
    }

    async processText(text: string): Promise<{ text: string; contexts: AtSymbolContext[] }> {
        const matches = findAtSymbolMatches(text);
        const contexts: AtSymbolContext[] = [];

        for (const match of matches) {
            let context: AtSymbolContext | undefined;

            switch (match.type) {
                case 'link':
                    context = this.createLinkContext(match.value);
                    if (context) {
                        // Start scraping in background
                        this.scrapeWebContent(context).catch(e =>
                            this.logService.error('[AtSymbolService] Failed to scrape web content:', e)
                        );
                        contexts.push(context);
                    }
                    break;

                case 'file':
                    context = await this.fileExplorerProvider.createFileContext(match.value);
                    if (context) contexts.push(context);
                    break;

                case 'folder':
                    context = await this.fileExplorerProvider.createFolderContext(match.value);
                    if (context) contexts.push(context);
                    break;
            }
        }

        return { text, contexts };
    }

    async getCompletions(text: string, position: number): Promise<AtSymbolContext[]> {
        const beforeCursor = text.substring(0, position);
        const match = beforeCursor.match(/@(file|folder|link)?:?([^\s]*)$/);
        if (!match) return [];

        const type = match[1];
        const prefix = match[2].toLowerCase();
        let results: AtSymbolContext[] = [];

        switch (type) {
            case 'file':
                results = await this.fileExplorerProvider.getFileCompletions(prefix);
                break;

            case 'folder':
                results = await this.fileExplorerProvider.getFolderCompletions(prefix);
                break;

            case 'link':
                if (prefix.match(/^https?:\/\//) || prefix.includes('.')) {
                    const context = this.createLinkContext(prefix);
                    if (context) results.push(context);
                }
                break;

            default:
                // If no type specified, show all types
                const files = await this.fileExplorerProvider.getFileCompletions(prefix);
                const folders = await this.fileExplorerProvider.getFolderCompletions(prefix);
                results = [...files, ...folders];

                if (prefix.match(/^https?:\/\//) || prefix.includes('.')) {
                    const linkContext = this.createLinkContext(prefix);
                    if (linkContext) results.push(linkContext);
                }
        }

        return results;
    }

    createLinkContext(url: string, metadata?: { title?: string; description?: string }): AtSymbolContext {
        const cached = this.linkContextCache.get(url);
        if (cached) return cached;

        try {
            const uri = URI.parse(url.startsWith('http') ? url : `https://${url}`);

            const context: AtSymbolContext = {
                type: 'link',
                value: uri.toString(true),
                displayName: metadata?.title || this.formatDisplayUrl(uri),
                metadata: {
                    uri,
                    title: metadata?.title,
                    description: metadata?.description
                }
            };

            this.linkContextCache.set(url, context);
            return context;
        } catch (e) {
            return {
                type: 'link',
                value: url,
                displayName: url,
                metadata: {
                    title: metadata?.title,
                    description: metadata?.description
                }
            };
        }
    }

    formatReference(context: AtSymbolContext): string {
        return formatContextReference(context);
    }

    private formatDisplayUrl(uri: URI): string {
        let display = uri.toString(true)
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '');

        if (display.length > 50) {
            display = display.substring(0, 47) + '...';
        }

        return display;
    }

    private async scrapeWebContent(context: AtSymbolContext): Promise<void> {
        if (!context.metadata?.uri) return;

        try {
            const puppeteer = await import('puppeteer');

            if (!this.browser) {
                this.browser = await puppeteer.launch({
                    headless: 'new',
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
            }

            const page = await this.browser.newPage();
            await page.goto(context.metadata.uri.toString(), {
                waitUntil: 'networkidle0',
                timeout: 10000
            });

            // Extract content
            const content: ScrapedContent = await page.evaluate(() => {
                const article = document.querySelector('article') || document.querySelector('main') || document.body;
                const titleEl = document.querySelector('title') || document.querySelector('h1');
                const descriptionEl = document.querySelector('meta[name="description"]');

                // Get code blocks
                const codeBlocks = Array.from(article.querySelectorAll('pre, code')).map(el => el.textContent);

                // Get main text content
                const text = article.textContent;

                return {
                    title: titleEl?.textContent || '',
                    description: descriptionEl?.getAttribute('content') || '',
                    text: text || null,
                    code: codeBlocks.filter((block): block is string => typeof block === 'string')
                };
            });

            // Update context with scraped content
            this.updateContextWithScrapedContent(context, content);

            await page.close();

        } catch (error) {
            this.logService.error('[AtSymbolService] Failed to scrape web content:', error);
            throw error;
        }
    }

    private updateContextWithScrapedContent(context: AtSymbolContext, content: ScrapedContent) {
        // Update context with scraped content
        if (content.title && !context.metadata?.title) {
            context.metadata = context.metadata || {};
            context.metadata.title = content.title;
            context.displayName = content.title;
        }

        if (content.description && !context.metadata?.description) {
            context.metadata = context.metadata || {};
            context.metadata.description = content.description;
        }

        // Store the scraped content
        if (context.metadata?.uri) {
            this.webSearchService.clone(context.metadata.uri.toString()).catch(e =>
                this.logService.error('[AtSymbolService] Failed to store scraped content:', e)
            );
        }
    }

    dispose() {
        if (this.browser) {
            this.browser.close().catch(() => {});
            this.browser = null;
        }
    }
}

registerSingleton(IAtSymbolService, new SyncDescriptor(AtSymbolService));
