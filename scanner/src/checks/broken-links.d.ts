/**
 * Check: Broken Links
 * Severity: high
 *
 * Collects all <a href> links on the page and makes HEAD requests to each.
 * Reports any link that returns a 4xx or 5xx response, or fails to connect.
 * Respects the allowlist and only reports — never follows/crawls — links.
 */
import type { Page } from 'playwright';
import type { Issue } from '../types.js';
/**
 * Extracts all <a href> links from the live page DOM, then probes each one.
 * Returns an Issue for every link that is broken (4xx / 5xx / network error).
 *
 * @param page       Playwright Page object (already navigated).
 * @param pageUrl    The URL of the page being scanned.
 * @param screenshotPath  Path to the page screenshot.
 * @param timestamp  ISO scan timestamp.
 */
export declare function checkBrokenLinks(page: Page, pageUrl: string, screenshotPath: string | null, timestamp: string): Promise<Issue[]>;
