/**
 * Check: Slow Load Time
 * Severity: medium
 *
 * Flags pages with a total navigation load time above a configurable threshold.
 * Default threshold: 3000 ms (TTFB + full page load).
 */
import type { Issue } from '../types.js';
/**
 * Returns an Issue if the page load time exceeded the slow threshold.
 *
 * @param url            The page URL.
 * @param loadTimeMs     Measured load time in milliseconds.
 * @param screenshotPath Path to the full-page screenshot.
 * @param timestamp      ISO timestamp of the scan.
 * @param thresholdMs    Threshold in ms above which the page is considered slow.
 */
export declare function checkSlowLoad(url: string, loadTimeMs: number, screenshotPath: string | null, timestamp: string, thresholdMs?: number): Issue[];
