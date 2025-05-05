/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IChatRequestContext, IChatResponse, IChatResponseFragment } from '../../../common/chat.js';
import { IChatParticipant } from '../../../common/chatParticipant.js';
import { IChatAgentService } from '../../chat/common/chatAgents.js';
import { IWebSearchService, WebSearchResult } from '../common/webSearchService.js';
import { ISmartSearchService, SearchResult } from '../common/smartSearchService.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';

export class WebSearchParticipant extends Disposable implements IChatParticipant {
    static readonly ID = 'web';

    constructor(
        @IWebSearchService private readonly webSearchService: IWebSearchService,
        @ISmartSearchService private readonly smartSearchService: ISmartSearchService,
        @IChatAgentService private readonly chatAgentService: IChatAgentService,
        @ILogService private readonly logService: ILogService
    ) {
        super();

        this.registerParticipant();
    }

    private registerParticipant() {
        this._register(this.chatAgentService.registerAgent('web-search', {
            id: 'web-search',
            name: 'web',
            fullName: 'Web Search Assistant',
            description: localize('webSearch.description', "Smart web search for documentation, code examples, and website analysis"),
            metadata: {
                isSticky: false,
                sampleRequest: 'find react hooks best practices'
            },
            slashCommands: [
                {
                    name: 'search',
                    description: localize('webSearch.searchCommand', "Smart search for programming documentation and examples"),
                },
                {
                    name: 'clone',
                    description: localize('webSearch.cloneCommand', "Analyze and clone a website's UI design"),
                }
            ],
            disambiguation: [
                {
                    category: 'web_search',
                    description: localize('webSearch.disambiguation', "Intelligent web search with AI-powered query optimization"),
                    examples: [
                        'How do React hooks work with TypeScript?',
                        'Find NextJS Server Components examples',
                        'What are the best practices for Node.js error handling?'
                    ]
                }
            ]
        }));
    }

    async provideReply(request: string, context: IChatRequestContext): Promise<IChatResponse> {
        const [command, ...args] = request.trim().split(/\s+/);
        const query = args.join(' ');

        try {
            if (command === '/clone' || (command === '@web' && args[0] === 'clone')) {
                return this.handleClone(args.slice(command === '@web' ? 1 : 0).join(' '));
            }

            // For search, use smart search service
            return this.handleSmartSearch(query, context);
        } catch (error) {
            this.logService.error('[WebSearchParticipant] Error:', error);
            throw error;
        }
    }

    private async handleSmartSearch(query: string, context: IChatRequestContext): Promise<IChatResponse> {
        // Generate optimized search query using AI
        const smartQuery = await this.smartSearchService.generateSmartQuery(query, context.requestId);

        // Get results from both pages
        const page1Results = await this.smartSearchService.searchGoogle(smartQuery, 1);
        const page2Results = await this.smartSearchService.searchGoogle(smartQuery, 2);

        // Combine and limit results
        const allResults = [...page1Results, ...page2Results].slice(0, 20);

        // Extract content from results
        const extractedContent = await this.smartSearchService.extractContent(allResults);

        return {
            fragments: this.formatSearchResults(extractedContent, smartQuery)
        };
    }

    private async handleClone(url: string): Promise<IChatResponse> {
        const results = await this.webSearchService.clone(url);
        return {
            fragments: this.formatCloneResults(results)
        };
    }

    private formatSearchResults(results: {
        title: string;
        content: string;
        type: 'text' | 'code' | 'mixed';
        relevance: number;
        source: string;
    }[],
    query: { intent: string }): IChatResponseFragment[] {
        const fragments: IChatResponseFragment[] = [];

        fragments.push({
            kind: 'text',
            value: `Found ${results.length} relevant results for your ${query.intent} query:\n\n`
        });

        results.forEach((result, index) => {
            fragments.push({
                kind: 'text',
                value: `## ${index + 1}. ${result.title}\nSource: ${result.source}\n`
            });

            if (result.type === 'code' || result.type === 'mixed') {
                const codeBlocks = result.content.split('\n\n');
                codeBlocks.forEach(code => {
                    if (code.trim()) {
                        fragments.push({
                            kind: 'code',
                            language: this.detectLanguage(code),
                            value: code
                        });
                    }
                });
            }

            if (result.type === 'text' || result.type === 'mixed') {
                fragments.push({
                    kind: 'text',
                    value: result.content + '\n\n---\n'
                });
            }
        });

        return fragments;
    }

    private formatCloneResults(results: WebSearchResult[]): IChatResponseFragment[] {
        const fragments: IChatResponseFragment[] = [];

        for (const result of results) {
            switch (result.type) {
                case 'text':
                    fragments.push({
                        kind: 'text',
                        value: `Content from ${result.metadata.url}:\n${result.content}`
                    });
                    break;

                case 'image':
                    fragments.push({
                        kind: 'image',
                        value: result.content,
                        altText: `Screenshot from ${result.metadata.url}`
                    });
                    break;

                case 'structured':
                    fragments.push({
                        kind: 'text',
                        value: `Structure from ${result.metadata.url}:`
                    });
                    fragments.push({
                        kind: 'code',
                        language: 'html',
                        value: result.content.html
                    });
                    if (result.content.styles) {
                        fragments.push({
                            kind: 'code',
                            language: 'css',
                            value: JSON.stringify(result.content.styles, null, 2)
                        });
                    }
                    break;
            }
        }

        return fragments;
    }

    private detectLanguage(code: string): string {
        // Simple language detection based on common patterns
        if (code.includes('function') || code.includes('const') || code.includes('let')) {
            return 'javascript';
        }
        if (code.includes('interface') || code.includes('type ') || code.includes('<T>')) {
            return 'typescript';
        }
        if (code.includes('class') || code.includes('public') || code.includes('private')) {
            return 'java';
        }
        if (code.includes('def ') || code.includes('import ') || code.includes('print(')) {
            return 'python';
        }
        return 'plaintext';
    }
}
