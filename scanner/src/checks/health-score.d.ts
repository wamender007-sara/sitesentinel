/**
 * Health score calculator.
 * Starts at 100 and deducts points per issue by severity.
 *
 * Penalty per issue:
 *   critical → -15
 *   high     → -10
 *   medium   →  -5
 *   low      →  -2
 *
 * Minimum score is clamped to 0.
 */
import type { Issue } from '../types.js';
/**
 * Computes a 0–100 health score based on an array of detected Issues.
 *
 * @param issues  All issues found on a page.
 * @returns       An integer score in the range [0, 100].
 */
export declare function computeHealthScore(issues: Issue[]): number;
