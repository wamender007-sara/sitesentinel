/**
 * Check: Console Errors
 * Severity: high
 *
 * Reports any JavaScript console.error() messages captured during page load.
 * Evidence is already collected by scanner.ts via the page 'console' event listener.
 */
import type { Issue } from '../types.js';
/**
 * Converts pre-collected consoleErrors strings into Issue objects.
 *
 * @param url          The page URL that was scanned.
 * @param errors       Array of console error message strings.
 * @param screenshotPath  Path to the full-page screenshot, if taken.
 * @param timestamp    ISO timestamp of the scan.
 */
export declare function checkConsoleErrors(url: string, errors: string[], screenshotPath: string | null, timestamp: string): Issue[];
