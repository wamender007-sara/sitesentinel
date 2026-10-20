import type { ScanOptions, ScanResult } from './types.js';
/**
 * Executes a full audit scan on a single web page.
 *
 * Enforcement:
 *  - Rule 1: Read-only inspection (passive navigation + DOM evaluation only).
 *  - Rule 2: Robots.txt checking & >= 2,000 ms rate limiting per domain.
 *  - Rule 3: Allowlist target validation.
 *  - Rule 5: Evidence collection (screenshot, timing, HTTP status, issues).
 *  - Rule 7: Pure typed functions with timeout and retry handling.
 *
 * @param targetUrl  Target URL to scan.
 * @param options    Scan configuration options.
 */
export declare function scanPage(targetUrl: string, options?: ScanOptions): Promise<ScanResult>;
