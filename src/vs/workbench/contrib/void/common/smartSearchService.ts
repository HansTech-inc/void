/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    pagemap?: {
        metatags?: Array<{ [key: string]: string }>;
    };
}

export interface SmartSearchQuery {
    query: string;
    context: string;
    intent: 'documentation' | 'example' | 'tutorial' | 'solution' | 'general';
    filters?: {
        language?: string;
        timeframe?: string;
        domain?: string;
    };
}

export interface ISmartSearchService {
    readonly _serviceBrand: undefined;

    /**
     * Generates an optimized search query based on user input and context
     */
    generateSmartQuery(userInput: string, context?: string): Promise<SmartSearchQuery>;

    /**
     * Performs a Google Custom Search with the given query
     */
    searchGoogle(query: SmartSearchQuery, page: number): Promise<SearchResult[]>;

    /**
     * Extracts and analyzes content from search results
     */
    extractContent(results: SearchResult[]): Promise<{
        title: string;
        content: string;
        type: 'text' | 'code' | 'mixed';
        relevance: number;
        source: string;
    }[]>;
}

export const ISmartSearchService = createDecorator<ISmartSearchService>('smartSearchService');
