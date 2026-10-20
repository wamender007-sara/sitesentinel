/**
 * Typed data definitions for SiteSentinel Scanner.
 * Adheres to Rule 7 (Clean, Typed, Modular Architecture).
 */
export interface TargetConfig {
    id: string;
    name: string;
    domain: string;
    allowedProtocols: string[];
    startUrls: string[];
    maxPagesPerRun?: number;
    maxDepth?: number;
    contactEmail?: string;
    enabled: boolean;
}
export interface TargetsFile {
    version: string;
    targets: TargetConfig[];
}
export interface RobotsCheckResult {
    allowed: boolean;
    reason?: string;
    crawlDelaySeconds?: number;
}
/**
 * Represents a single detected issue during a scan.
 * Each check module produces zero or more Issues.
 */
export interface Issue {
    /** Short machine-readable identifier, e.g. "broken_link", "missing_alt" */
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    /** The page URL where this issue was detected */
    url: string;
    evidence: {
        screenshotPath?: string | null;
        /** CSS selector of the offending element, if applicable */
        selector?: string;
        /** Raw supporting data (response code, contrast ratio, etc.) */
        raw?: any;
    };
    stepsToReproduce: string[];
    detectedAt: string;
}
export interface ScanResult {
    url: string;
    finalUrl: string;
    status: number;
    statusText: string;
    loadTimeMs: number;
    title: string;
    screenshotPath: string | null;
    timestamp: string;
    success: boolean;
    error?: string;
    consoleErrors: string[];
    pageErrors: string[];
    retriesAttempted: number;
    robotsAllowed: boolean;
    /** All issues detected on this page across all check modules */
    issues: Issue[];
    /** 0-100 health score derived from issue severities */
    healthScore: number;
}
export interface ScanOptions {
    timeoutMs?: number;
    maxRetries?: number;
    screenshotsDir?: string;
    skipRobotsCheck?: boolean;
}
