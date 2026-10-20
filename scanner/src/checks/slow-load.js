const DEFAULT_SLOW_THRESHOLD_MS = 3000;
/**
 * Returns an Issue if the page load time exceeded the slow threshold.
 *
 * @param url            The page URL.
 * @param loadTimeMs     Measured load time in milliseconds.
 * @param screenshotPath Path to the full-page screenshot.
 * @param timestamp      ISO timestamp of the scan.
 * @param thresholdMs    Threshold in ms above which the page is considered slow.
 */
export function checkSlowLoad(url, loadTimeMs, screenshotPath, timestamp, thresholdMs = DEFAULT_SLOW_THRESHOLD_MS) {
    if (loadTimeMs < thresholdMs)
        return [];
    return [
        {
            type: 'slow_load',
            severity: 'medium',
            title: 'Slow Page Load Time',
            description: `Page took ${loadTimeMs} ms to fully load, exceeding the ${thresholdMs} ms threshold. ` +
                `Slow pages hurt Core Web Vitals (LCP/FID) and user retention.`,
            url,
            evidence: {
                screenshotPath,
                raw: { loadTimeMs, thresholdMs },
            },
            stepsToReproduce: [
                `Open ${url} in a browser.`,
                'Open DevTools → Network tab → Reload.',
                `Observe total load time exceeds ${thresholdMs} ms.`,
            ],
            detectedAt: timestamp,
        },
    ];
}
