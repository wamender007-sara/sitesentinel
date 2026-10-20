/**
 * Check: HTTP Error Status
 * Severity: high (4xx) | critical (5xx)
 *
 * Flags pages that returned an HTTP error status code.
 */
import type { Issue } from '../types.js';
/**
 * Returns an Issue if the HTTP status is >= 400.
 *
 * @param url        The page URL.
 * @param status     HTTP status code returned by the page.
 * @param statusText HTTP status text.
 * @param timestamp  ISO timestamp of the scan.
 */
export declare function checkHttpStatus(url: string, status: number, statusText: string, timestamp: string): Issue[];
