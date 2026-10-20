const PENALTIES = {
    critical: 15,
    high: 10,
    medium: 5,
    low: 2,
};
/**
 * Computes a 0–100 health score based on an array of detected Issues.
 *
 * @param issues  All issues found on a page.
 * @returns       An integer score in the range [0, 100].
 */
export function computeHealthScore(issues) {
    const deduction = issues.reduce((total, issue) => total + (PENALTIES[issue.severity] ?? 0), 0);
    return Math.max(0, 100 - deduction);
}
