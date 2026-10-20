/**
 * Check: Mobile Layout / Viewport
 * Severity: medium
 *
 * Detects common mobile layout problems by evaluating the page at a
 * mobile viewport size (390 × 844, iPhone 14 equivalent) and checking:
 *   1. Horizontal overflow (content wider than the viewport)
 *   2. Fixed-width elements that force horizontal scroll
 *   3. Tap targets smaller than 44 × 44 CSS pixels (WCAG 2.5.5)
 *
 * Checks are performed read-only via page.evaluate() (Rule 1).
 */
import type { Page } from 'playwright';
import type { Issue } from '../types.js';
/**
 * Evaluates the page at mobile viewport and returns Issues for mobile layout problems.
 *
 * @param page            Playwright Page (already navigated).
 * @param pageUrl         The scanned page URL.
 * @param screenshotPath  Path to the full-page screenshot.
 * @param timestamp       ISO scan timestamp.
 */
export declare function checkMobileLayout(page: Page, pageUrl: string, screenshotPath: string | null, timestamp: string): Promise<Issue[]>;
