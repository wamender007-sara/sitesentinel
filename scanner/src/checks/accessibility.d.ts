/**
 * Check: Accessibility Violations
 * Severity: high (missing alt) | medium (missing label, empty heading)
 *
 * Runs lightweight in-browser DOM checks for common WCAG 2.1 AA failures:
 *   - Images missing an `alt` attribute
 *   - Form inputs missing an associated <label>
 *   - Empty <h1>–<h6> heading elements
 *   - Missing <html lang> attribute
 *
 * Note: For full WCAG auditing, axe-core integration can be layered on top.
 * These checks deliberately use only DOM queries (Rule 1 – read-only).
 */
import type { Page } from 'playwright';
import type { Issue } from '../types.js';
/**
 * Runs all accessibility checks on a live Playwright page.
 * Returns an Issue for each violation found.
 *
 * @param page            Playwright Page (already navigated).
 * @param pageUrl         The scanned page URL.
 * @param screenshotPath  Path to the full-page screenshot.
 * @param timestamp       ISO scan timestamp.
 */
export declare function checkAccessibility(page: Page, pageUrl: string, screenshotPath: string | null, timestamp: string): Promise<Issue[]>;
