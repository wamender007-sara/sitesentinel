import type { TargetConfig, TargetsFile } from './types.js';
/**
 * Loads and parses the allowlist configuration file.
 * Enforces Rule 3 (Only scan domains listed in config/targets.json).
 */
export declare function loadAllowlist(configPath?: string): TargetsFile;
/**
 * Validates whether a target URL is explicitly authorized in the allowlist.
 * Returns validation outcome along with matched target metadata.
 */
export declare function validateUrlAgainstAllowlist(rawUrl: string, configPath?: string): {
    allowed: boolean;
    target?: TargetConfig;
    reason?: string;
};
/**
 * Retrieves all initial scan entrypoints from enabled targets.
 */
export declare function getAllowlistedStartUrls(configPath?: string): string[];
