import { type Browser, type BrowserContext } from 'playwright';
export declare const DEFAULT_USER_AGENT = "SiteSentinel-AuditBot/1.0 (+https://sitesentinel.hackathon/bot; ReadOnlyInspection)";
/**
 * Returns a shared headless Chromium browser instance.
 * Reuses browser between requests to maximize scanning performance.
 */
export declare function getBrowser(): Promise<Browser>;
/**
 * Creates an isolated browser context with our custom User-Agent and viewport.
 */
export declare function createAuditingContext(): Promise<BrowserContext>;
/**
 * Gracefully shuts down the browser instance.
 */
export declare function closeBrowser(): Promise<void>;
