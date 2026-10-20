import { chromium } from 'playwright';
let browserInstance = null;
export const DEFAULT_USER_AGENT = 'SiteSentinel-AuditBot/1.0 (+https://sitesentinel.hackathon/bot; ReadOnlyInspection)';
/**
 * Returns a shared headless Chromium browser instance.
 * Reuses browser between requests to maximize scanning performance.
 */
export async function getBrowser() {
    if (!browserInstance || !browserInstance.isConnected()) {
        browserInstance = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
        });
    }
    return browserInstance;
}
/**
 * Creates an isolated browser context with our custom User-Agent and viewport.
 */
export async function createAuditingContext() {
    const browser = await getBrowser();
    return browser.newContext({
        userAgent: DEFAULT_USER_AGENT,
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true,
    });
}
/**
 * Gracefully shuts down the browser instance.
 */
export async function closeBrowser() {
    if (browserInstance && browserInstance.isConnected()) {
        await browserInstance.close();
        browserInstance = null;
    }
}
