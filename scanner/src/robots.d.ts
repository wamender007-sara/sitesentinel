import type { RobotsCheckResult } from './types.js';
interface ParsedRule {
    userAgent: string;
    disallows: string[];
    allows: string[];
    crawlDelay?: number;
}
/**
 * Fetches robots.txt for a given URL's origin and returns the cached rules.
 * If fetching fails (e.g. 404 or network unreachable), assumes scanning is permissible.
 */
export declare function getRobotsRulesForOrigin(origin: string): Promise<ParsedRule[]>;
/**
 * Checks whether a given path is allowed by robots.txt according to Rule 2.
 */
export declare function checkRobotsPermission(targetUrl: string, botName?: string): Promise<RobotsCheckResult>;
export {};
