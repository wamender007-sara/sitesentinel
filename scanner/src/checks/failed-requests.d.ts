/**
 * Check: Failed Network Requests
 * Severity: high (4xx/5xx sub-resources) | medium (blocked/aborted)
 *
 * Intercepts all network requests made by the page during load using
 * Playwright's request/response events and flags any that fail.
 * This is passive observation only (Rule 1 — read-only).
 */
import type { Page } from 'playwright';
import type { Issue } from '../types.js';
export interface FailedRequest {
    url: string;
    status: number;
    resourceType: string;
    errorText?: string;
}
/**
 * Attaches event listeners to the Playwright page to collect failed requests.
 * Call this BEFORE page.goto(), then call getIssues() after navigation.
 */
export declare function attachFailedRequestListener(page: Page): () => FailedRequest[];
/**
 * Converts collected FailedRequest records into Issue objects.
 *
 * @param failed         Array of failed sub-resource requests.
 * @param pageUrl        The page that contained these resources.
 * @param screenshotPath Path to the full-page screenshot.
 * @param timestamp      ISO scan timestamp.
 */
export declare function buildFailedRequestIssues(failed: FailedRequest[], pageUrl: string, screenshotPath: string | null, timestamp: string): Issue[];
