/**
 * Check: Missing SEO / Meta Tags
 * Severity: medium
 *
 * Checks for common on-page SEO problems:
 *   - Missing or empty <title>
 *   - Missing or empty <meta name="description">
 *   - Missing <meta name="viewport"> (mobile friendliness)
 *   - Missing canonical <link rel="canonical">
 *   - Missing <h1> or multiple <h1> tags
 */
import type { Page } from 'playwright';
import type { Issue } from '../types.js';

interface MetaViolation {
  type: string;
  detail: string;
  selector: string;
}

async function collectMetaViolations(page: Page): Promise<MetaViolation[]> {
  return page.evaluate((): MetaViolation[] => {
    const violations: MetaViolation[] = [];

    // 1. Title check
    const title = document.title?.trim();
    if (!title) {
      violations.push({ type: 'missing_title', selector: 'title', detail: 'Page is missing a <title> element or the title is empty.' });
    }

    // 2. Meta description
    const descEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descEl || !descEl.content?.trim()) {
      violations.push({ type: 'missing_meta_description', selector: 'meta[name="description"]', detail: 'Page is missing a <meta name="description"> tag or its content is empty.' });
    }

    // 3. Viewport meta
    const viewportEl = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!viewportEl) {
      violations.push({ type: 'missing_viewport', selector: 'meta[name="viewport"]', detail: 'Page is missing <meta name="viewport"> — required for responsive/mobile layouts.' });
    }

    // 4. Canonical
    const canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      violations.push({ type: 'missing_canonical', selector: 'link[rel="canonical"]', detail: 'Page is missing a canonical <link rel="canonical"> tag.' });
    }

    // 5. H1 checks
    const h1s = document.querySelectorAll('h1');
    if (h1s.length === 0) {
      violations.push({ type: 'missing_h1', selector: 'h1', detail: 'Page has no <h1> heading — required for content hierarchy and SEO.' });
    } else if (h1s.length > 1) {
      violations.push({ type: 'multiple_h1', selector: 'h1', detail: `Page has ${h1s.length} <h1> elements — only one is recommended per page.` });
    }

    return violations;
  });
}

/**
 * Returns Issues for all missing/invalid SEO/meta tags detected on the page.
 *
 * @param page            Playwright Page (already navigated).
 * @param pageUrl         The scanned page URL.
 * @param screenshotPath  Path to the full-page screenshot.
 * @param timestamp       ISO scan timestamp.
 */
export async function checkMeta(
  page: Page,
  pageUrl: string,
  screenshotPath: string | null,
  timestamp: string,
): Promise<Issue[]> {
  const violations = await collectMetaViolations(page);

  return violations.map((v) => ({
    type: `seo_${v.type}`,
    severity: 'medium' as const,
    title: `SEO: ${v.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
    description: v.detail,
    url: pageUrl,
    evidence: {
      screenshotPath,
      selector: v.selector,
      raw: { violation: v.type },
    },
    stepsToReproduce: [
      `Open ${pageUrl} in a browser.`,
      'View page source (Ctrl+U / Cmd+U).',
      `Search for: ${v.selector}`,
      `Confirm: ${v.detail}`,
    ],
    detectedAt: timestamp,
  }));
}
