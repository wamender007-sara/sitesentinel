const MOBILE_WIDTH = 390;
const MOBILE_HEIGHT = 844;
const MIN_TAP_TARGET_PX = 44;
async function collectMobileViolations(page) {
    // Temporarily resize to mobile viewport
    await page.setViewportSize({ width: MOBILE_WIDTH, height: MOBILE_HEIGHT });
    const violations = await page.evaluate(({ MOBILE_WIDTH, MIN_TAP_TARGET_PX }) => {
        const v = [];
        // 1. Horizontal overflow check
        const bodyWidth = document.body.scrollWidth;
        if (bodyWidth > MOBILE_WIDTH) {
            v.push({
                type: 'horizontal_overflow',
                detail: `Page content width (${bodyWidth}px) exceeds the mobile viewport (${MOBILE_WIDTH}px), causing horizontal scrolling.`,
                raw: { bodyScrollWidth: bodyWidth, viewportWidth: MOBILE_WIDTH },
            });
        }
        // 2. Small tap targets — check buttons and links
        const interactives = Array.from(document.querySelectorAll('a, button, [role="button"], input, select, textarea'));
        const small = interactives.slice(0, 50).filter((el) => {
            const rect = el.getBoundingClientRect();
            return (rect.width > 0 || rect.height > 0) &&
                (rect.width < MIN_TAP_TARGET_PX || rect.height < MIN_TAP_TARGET_PX);
        });
        if (small.length > 0) {
            const tagNames = [...new Set(small.map((el) => el.tagName.toLowerCase()))].join(', ');
            v.push({
                type: 'small_tap_target',
                detail: `${small.length} interactive element(s) (${tagNames}) have tap targets smaller than ${MIN_TAP_TARGET_PX}×${MIN_TAP_TARGET_PX}px (WCAG 2.5.5).`,
                selector: tagNames,
                raw: { count: small.length, threshold: MIN_TAP_TARGET_PX },
            });
        }
        return v;
    }, { MOBILE_WIDTH, MIN_TAP_TARGET_PX });
    return violations;
}
/**
 * Evaluates the page at mobile viewport and returns Issues for mobile layout problems.
 *
 * @param page            Playwright Page (already navigated).
 * @param pageUrl         The scanned page URL.
 * @param screenshotPath  Path to the full-page screenshot.
 * @param timestamp       ISO scan timestamp.
 */
export async function checkMobileLayout(page, pageUrl, screenshotPath, timestamp) {
    const violations = await collectMobileViolations(page);
    return violations.map((v) => ({
        type: `mobile_${v.type}`,
        severity: 'medium',
        title: v.type === 'horizontal_overflow'
            ? 'Mobile Horizontal Overflow'
            : 'Small Tap Target (WCAG 2.5.5)',
        description: v.detail,
        url: pageUrl,
        evidence: {
            screenshotPath,
            selector: v.selector,
            raw: v.raw,
        },
        stepsToReproduce: [
            `Open ${pageUrl} in Chrome DevTools.`,
            `Toggle device simulation to a ${MOBILE_WIDTH}px mobile viewport.`,
            `Observe: ${v.detail}`,
        ],
        detectedAt: timestamp,
    }));
}
