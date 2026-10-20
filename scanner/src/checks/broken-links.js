/**
 * Performs a lightweight HEAD request to a URL and returns the status.
 * Falls back to GET if HEAD returns 405 Method Not Allowed.
 */
async function headRequest(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        let response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': 'SiteSentinel-AuditBot/1.0 (+https://sitesentinel.hackathon/bot)',
            },
        });
        // Some servers don't support HEAD — retry with GET
        if (response.status === 405) {
            response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                redirect: 'follow',
                headers: {
                    'User-Agent': 'SiteSentinel-AuditBot/1.0 (+https://sitesentinel.hackathon/bot)',
                },
            });
        }
        clearTimeout(timer);
        return { href: url, status: response.status, ok: response.ok };
    }
    catch (err) {
        clearTimeout(timer);
        return { href: url, status: 0, ok: false, error: err.message };
    }
}
/**
 * Extracts all <a href> links from the live page DOM, then probes each one.
 * Returns an Issue for every link that is broken (4xx / 5xx / network error).
 *
 * @param page       Playwright Page object (already navigated).
 * @param pageUrl    The URL of the page being scanned.
 * @param screenshotPath  Path to the page screenshot.
 * @param timestamp  ISO scan timestamp.
 */
export async function checkBrokenLinks(page, pageUrl, screenshotPath, timestamp) {
    // Collect unique, absolute href values from all <a> tags on the page
    const rawHrefs = await page.$$eval('a[href]', (anchors) => anchors.map((a) => a.href).filter(Boolean));
    // Deduplicate and filter out non-http links (mailto:, javascript:, #anchors)
    const uniqueLinks = [
        ...new Set(rawHrefs.filter((h) => h.startsWith('http://') || h.startsWith('https://'))),
    ];
    const results = await Promise.all(uniqueLinks.map((link) => headRequest(link)));
    const issues = [];
    for (const result of results) {
        if (result.ok)
            continue;
        const statusLabel = result.status === 0 ? 'Network Error' : `HTTP ${result.status}`;
        issues.push({
            type: 'broken_link',
            severity: 'high',
            title: `Broken Link – ${statusLabel}`,
            description: result.status === 0
                ? `Link to "${result.href}" could not be reached: ${result.error ?? 'network error'}.`
                : `Link to "${result.href}" returned HTTP ${result.status}.`,
            url: pageUrl,
            evidence: {
                screenshotPath,
                raw: { href: result.href, status: result.status, error: result.error },
            },
            stepsToReproduce: [
                `Open ${pageUrl} in a browser.`,
                `Click the link pointing to: ${result.href}`,
                `Observe the ${statusLabel} response.`,
            ],
            detectedAt: timestamp,
        });
    }
    return issues;
}
