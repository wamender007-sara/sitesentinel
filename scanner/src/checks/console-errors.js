/**
 * Converts pre-collected consoleErrors strings into Issue objects.
 *
 * @param url          The page URL that was scanned.
 * @param errors       Array of console error message strings.
 * @param screenshotPath  Path to the full-page screenshot, if taken.
 * @param timestamp    ISO timestamp of the scan.
 */
export function checkConsoleErrors(url, errors, screenshotPath, timestamp) {
    return errors.map((msg) => ({
        type: 'console_error',
        severity: 'high',
        title: 'JavaScript Console Error',
        description: `A JavaScript error was logged to the browser console during page load: "${msg}"`,
        url,
        evidence: {
            screenshotPath,
            raw: { message: msg },
        },
        stepsToReproduce: [
            `Open ${url} in a browser.`,
            'Open DevTools → Console tab.',
            `Observe error: "${msg}"`,
        ],
        detectedAt: timestamp,
    }));
}
