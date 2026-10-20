/**
 * Attaches event listeners to the Playwright page to collect failed requests.
 * Call this BEFORE page.goto(), then call getIssues() after navigation.
 */
export function attachFailedRequestListener(page) {
    const failed = [];
    page.on('response', (response) => {
        const status = response.status();
        if (status >= 400) {
            const req = response.request();
            failed.push({
                url: response.url(),
                status,
                resourceType: req.resourceType(),
            });
        }
    });
    page.on('requestfailed', (request) => {
        const url = request.url();
        // Skip main frame navigations (covered by http-status check)
        if (request.isNavigationRequest())
            return;
        failed.push({
            url,
            status: 0,
            resourceType: request.resourceType(),
            errorText: request.failure()?.errorText ?? 'request failed',
        });
    });
    return () => failed;
}
/**
 * Converts collected FailedRequest records into Issue objects.
 *
 * @param failed         Array of failed sub-resource requests.
 * @param pageUrl        The page that contained these resources.
 * @param screenshotPath Path to the full-page screenshot.
 * @param timestamp      ISO scan timestamp.
 */
export function buildFailedRequestIssues(failed, pageUrl, screenshotPath, timestamp) {
    return failed.map((f) => {
        const is5xx = f.status >= 500;
        const severity = f.status === 0 ? 'medium' : is5xx ? 'high' : 'high';
        const statusLabel = f.status === 0 ? 'Network Error' : `HTTP ${f.status}`;
        return {
            type: 'failed_request',
            severity,
            title: `Failed Sub-resource Request – ${statusLabel}`,
            description: f.status === 0
                ? `The ${f.resourceType} resource "${f.url}" failed to load: ${f.errorText ?? 'network error'}.`
                : `The ${f.resourceType} resource "${f.url}" returned HTTP ${f.status}.`,
            url: pageUrl,
            evidence: {
                screenshotPath,
                raw: { resourceUrl: f.url, status: f.status, resourceType: f.resourceType, errorText: f.errorText },
            },
            stepsToReproduce: [
                `Open ${pageUrl} in a browser.`,
                'Open DevTools → Network tab.',
                `Look for the failed request: ${f.url}`,
                `Observe the ${statusLabel} status.`,
            ],
            detectedAt: timestamp,
        };
    });
}
