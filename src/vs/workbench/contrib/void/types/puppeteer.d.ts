// Type definitions for puppeteer
declare module 'puppeteer' {
    export interface LaunchOptions {
        headless?: boolean | 'new';
        args?: string[];
        defaultViewport?: {
            width: number;
            height: number;
        } | null;
        timeout?: number;
    }

    export interface NavigationOptions {
        waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
        timeout?: number;
    }

    export interface Browser {
        newPage(): Promise<Page>;
        close(): Promise<void>;
    }

    export interface Page {
        goto(url: string, options?: NavigationOptions): Promise<any>;
        evaluate<T>(pageFunction: () => T): Promise<T>;
        close(): Promise<void>;
    }

    export function launch(options?: LaunchOptions): Promise<Browser>;
}

declare module 'puppeteer-core' {
    export * from 'puppeteer';
}
