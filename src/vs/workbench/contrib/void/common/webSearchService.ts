/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export interface WebSearchResult {
    type: 'text' | 'image' | 'code' | 'structured';
    content: any;
    metadata: {
        url: string;
        timestamp: number;
        context: string;
    };
}

export interface IWebSearchService {
    readonly _serviceBrand: undefined;

    search(query: string, options: WebSearchOptions): Promise<WebSearchResult[]>;
    navigateAndCapture(url: string, options: CaptureOptions): Promise<WebSearchResult[]>;
    clone(url: string): Promise<WebSearchResult[]>;
}

export interface WebSearchOptions {
    searchType?: 'docs' | 'stackoverflow' | 'github' | 'npm' | 'all';
    language?: string;
    limit?: number;
}

export interface CaptureOptions {
    selectors?: string[];
    extractors?: ('text' | 'images' | 'code' | 'dom' | 'styles')[];
    screenshot?: boolean;
}

export const IWebSearchService = createDecorator<IWebSearchService>('webSearchService');
