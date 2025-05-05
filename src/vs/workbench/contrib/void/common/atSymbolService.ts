/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';

export type AtSymbolType = 'file' | 'folder' | 'link';

export interface AtSymbolContext {
    type: AtSymbolType;
    value: string;
    displayName: string;
    metadata?: {
        uri?: URI;
        title?: string;
        description?: string;
    };
}

export interface IAtSymbolService {
    readonly _serviceBrand: undefined;

    /**
     * Process text to resolve @ symbol contexts
     */
    processText(text: string): Promise<{
        text: string;
        contexts: AtSymbolContext[];
    }>;

    /**
     * Get completions for @ symbols
     */
    getCompletions(text: string, position: number): Promise<AtSymbolContext[]>;

    /**
     * Create a context for a link
     */
    createLinkContext(url: string, metadata?: { title?: string; description?: string }): AtSymbolContext;

    /**
     * Format an @ symbol reference
     */
    formatReference(context: AtSymbolContext): string;
}

export const IAtSymbolService = createDecorator<IAtSymbolService>('atSymbolService');

export function formatContextReference(context: AtSymbolContext): string {
    switch (context.type) {
        case 'file':
            return `@file:${context.value}`;
        case 'folder':
            return `@folder:${context.value}`;
        case 'link':
            return `@link:${context.value}`;
        default:
            return `@${context.value}`;
    }
}

export interface IAtSymbolMatch {
    start: number;
    end: number;
    value: string;
    type: AtSymbolType | null;
}

/**
 * Find all @ symbol matches in text
 */
export function findAtSymbolMatches(text: string): IAtSymbolMatch[] {
    const matches: IAtSymbolMatch[] = [];
    const regex = /@(file|folder|link)?:?([^\s]+)/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push({
            start: match.index,
            end: match.index + match[0].length,
            value: match[2],
            type: (match[1] as AtSymbolType) || null
        });
    }

    return matches;
}
