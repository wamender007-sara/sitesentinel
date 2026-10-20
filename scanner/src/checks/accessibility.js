/**
 * Runs accessibility checks in the page context and returns raw violations.
 */
async function collectA11yViolations(page) {
    return page.evaluate(() => {
        const violations = [];
        // 1. Images missing alt attribute
        document.querySelectorAll('img:not([alt])').forEach((img) => {
            const src = img.getAttribute('src') || '';
            const selector = src ? `img[src="${src.slice(0, 60)}"]` : 'img';
            violations.push({
                type: 'missing_alt',
                selector,
                detail: `<img src="${src.slice(0, 80)}"> is missing an alt attribute.`,
            });
        });
        // 2. Form inputs missing labels
        document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])').forEach((input) => {
            const id = input.id;
            const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
            const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
            if (!hasLabel && !hasAriaLabel) {
                const sel = id ? `input#${id}` : `input[type="${input.type || 'text'}"]`;
                violations.push({
                    type: 'missing_label',
                    selector: sel,
                    detail: `${sel} has no associated <label>, aria-label, or aria-labelledby.`,
                });
            }
        });
        // 3. Empty headings
        document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
            if (!h.textContent?.trim()) {
                violations.push({
                    type: 'empty_heading',
                    selector: h.tagName.toLowerCase(),
                    detail: `Empty <${h.tagName.toLowerCase()}> heading element detected.`,
                });
            }
        });
        // 4. Missing lang attribute on <html>
        const htmlEl = document.documentElement;
        if (!htmlEl.getAttribute('lang')) {
            violations.push({
                type: 'missing_lang',
                selector: 'html',
                detail: '<html> element is missing a lang attribute (e.g. lang="en").',
            });
        }
        return violations;
    });
}
/**
 * Runs all accessibility checks on a live Playwright page.
 * Returns an Issue for each violation found.
 *
 * @param page            Playwright Page (already navigated).
 * @param pageUrl         The scanned page URL.
 * @param screenshotPath  Path to the full-page screenshot.
 * @param timestamp       ISO scan timestamp.
 */
export async function checkAccessibility(page, pageUrl, screenshotPath, timestamp) {
    const violations = await collectA11yViolations(page);
    return violations.map((v) => {
        const severityMap = {
            missing_alt: 'high',
            missing_label: 'medium',
            empty_heading: 'low',
            missing_lang: 'medium',
        };
        const titleMap = {
            missing_alt: 'Image Missing Alt Text (WCAG 1.1.1)',
            missing_label: 'Form Input Missing Label (WCAG 1.3.1)',
            empty_heading: 'Empty Heading Element (WCAG 2.4.6)',
            missing_lang: 'Missing HTML Lang Attribute (WCAG 3.1.1)',
        };
        return {
            type: `a11y_${v.type}`,
            severity: severityMap[v.type],
            title: titleMap[v.type],
            description: v.detail,
            url: pageUrl,
            evidence: {
                screenshotPath,
                selector: v.selector,
                raw: { violation: v.type },
            },
            stepsToReproduce: [
                `Open ${pageUrl} in a browser.`,
                `Inspect element: ${v.selector}`,
                `Confirm: ${v.detail}`,
            ],
            detectedAt: timestamp,
        };
    });
}
