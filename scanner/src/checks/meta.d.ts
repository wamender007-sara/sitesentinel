/**
 * Check: Missing SEO / Meta Tags
 * Severity: medium
 *
 * Checks for common on-page SEO problems:
 *   - Missing or empty <title>
 *   - Missing or empty <meta name="description">
 *   - Missing <meta name="viewport"> (mobile friendliness)
 *   - Missing canonical <link rel="canonical">
 *   - Missing <h1> or multiple <h1> tags
 */
import type { Page } from 'playwright';
import type { Issue } from '../types.js';
/**
 * Returns Issues for all missing/invalid SEO/meta tags detected on the page.
 *
 * @param page            Playwright Page (already navigated).
 * @param pageUrl         The scanned page URL.
 * @param screenshotPath  Path to the full-page screenshot.
 * @param timestamp       ISO scan timestamp.
 */
export declare function checkMeta(page: Page, pageUrl: string, screenshotPath: string | null, timestamp: string): Promise<Issue[]>;
