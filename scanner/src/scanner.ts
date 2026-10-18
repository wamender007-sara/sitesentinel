import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScanOptions, ScanResult, Issue } from './types.js';
import { validateUrlAgainstAllowlist } from './allowlist.js';
import { checkRobotsPermission } from './robots.js';
import { rateLimiter } from './rate-limiter.js';
import { createAuditingContext } from './browser.js';

// Detection check modules
import { checkConsoleErrors } from './checks/console-errors.js';
import { checkSlowLoad } from './checks/slow-load.js';
import { checkHttpStatus } from './checks/http-status.js';
import { checkBrokenLinks } from './checks/broken-links.js';
import { checkAccessibility } from './checks/accessibility.js';
import { checkMeta } from './checks/meta.js';
import { attachFailedRequestListener, buildFailedRequestIssues } from './checks/failed-requests.js';
import { checkMobileLayout } from './checks/mobile-layout.js';
import { computeHealthScore } from './checks/health-score.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default screenshot output directory: /scanner/output/screenshots
const DEFAULT_SCREENSHOTS_DIR = path.resolve(__dirname, '../output/screenshots');

/**
 * Sanitizes a URL into a safe filesystem filename segment.
 */
function sanitizeUrlForFilename(rawUrl: string): string {
  return rawUrl
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 100);
}

/**
 * Builds an early-exit ScanResult for pre-navigation failures (allowlist, robots).
 */
function earlyFailResult(
  targetUrl: string,
  timestamp: string,
  status: number,
  statusText: string,
  error: string,
  robotsAllowed: boolean,
): ScanResult {
  return {
    url: targetUrl,
    finalUrl: targetUrl,
    status,
    statusText,
    loadTimeMs: 0,
    title: '',
    screenshotPath: null,
    timestamp,
    success: false,
    error,
    consoleErrors: [],
    pageErrors: [],
    retriesAttempted: 0,
    robotsAllowed,
    issues: [],
    healthScore: 0,
  };
}

/**
 * Executes a full audit scan on a single web page.
 *
 * Enforcement:
 *  - Rule 1: Read-only inspection (passive navigation + DOM evaluation only).
 *  - Rule 2: Robots.txt checking & >= 2,000 ms rate limiting per domain.
 *  - Rule 3: Allowlist target validation.
 *  - Rule 5: Evidence collection (screenshot, timing, HTTP status, issues).
 *  - Rule 7: Pure typed functions with timeout and retry handling.
 *
 * @param targetUrl  Target URL to scan.
 * @param options    Scan configuration options.
 */
export async function scanPage(
  targetUrl: string,
  options: ScanOptions = {},
): Promise<ScanResult> {
  const timestamp = new Date().toISOString();
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxRetries = options.maxRetries ?? 2;
  const screenshotsDir = options.screenshotsDir ?? DEFAULT_SCREENSHOTS_DIR;

  // ── Rule 3: Allowlist enforcement ───────────────────────────────────────────
  const allowlistCheck = validateUrlAgainstAllowlist(targetUrl);
  if (!allowlistCheck.allowed) {
    return earlyFailResult(targetUrl, timestamp, 403, 'Forbidden - Allowlist Rejection', allowlistCheck.reason!, false);
  }

  // ── Rule 2a: Robots.txt check ────────────────────────────────────────────────
  if (!options.skipRobotsCheck) {
    const robotsCheck = await checkRobotsPermission(targetUrl);
    if (!robotsCheck.allowed) {
      return earlyFailResult(targetUrl, timestamp, 403, 'Forbidden - Blocked by robots.txt', robotsCheck.reason!, false);
    }
  }

  // ── Rule 2b: Polite rate limiting ─────────────────────────────────────────────
  await rateLimiter.waitForSlot(targetUrl, 2000);

  // Ensure output directory exists
  fs.mkdirSync(screenshotsDir, { recursive: true });

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    const context = await createAuditingContext();
    const page = await context.newPage();

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Capture unhandled page exceptions
    page.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });

    // Attach failed-request listener BEFORE navigation
    const getFailedRequests = attachFailedRequestListener(page);

    const startTime = performance.now();

    try {
      const response = await page.goto(targetUrl, {
        waitUntil: 'load',
        timeout: timeoutMs,
      });

      const loadTimeMs = Math.round(performance.now() - startTime);
      const status = response ? response.status() : 200;
      const statusText = response ? response.statusText() : 'OK';
      const finalUrl = page.url();
      const title = await page.title().catch(() => '');

      // ── Rule 5: Full-page screenshot ──────────────────────────────────────────
      const safeName = sanitizeUrlForFilename(targetUrl);
      const fileTimestamp = timestamp.replace(/[:.]/g, '-');
      const filename = `${safeName}_${fileTimestamp}.png`;
      const screenshotPath = path.join(screenshotsDir, filename);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // ── Phase 2: Run all detection checks ─────────────────────────────────────
      const issues: Issue[] = [];

      // 1. HTTP status
      issues.push(...checkHttpStatus(finalUrl, status, statusText, timestamp));

      // 2. Console errors (already collected)
      issues.push(...checkConsoleErrors(finalUrl, consoleErrors, screenshotPath, timestamp));

      // 3. Slow load
      issues.push(...checkSlowLoad(finalUrl, loadTimeMs, screenshotPath, timestamp));

      // 4. Failed sub-resource requests
      const failedReqs = getFailedRequests();
      issues.push(...buildFailedRequestIssues(failedReqs, finalUrl, screenshotPath, timestamp));

      // 5. Broken links (only on successful navigations)
      if (status < 400) {
        issues.push(...await checkBrokenLinks(page, finalUrl, screenshotPath, timestamp));
      }

      // 6. Accessibility checks
      if (status < 400) {
        issues.push(...await checkAccessibility(page, finalUrl, screenshotPath, timestamp));
      }

      // 7. SEO / Meta checks
      if (status < 400) {
        issues.push(...await checkMeta(page, finalUrl, screenshotPath, timestamp));
      }

      // 8. Mobile layout checks
      if (status < 400) {
        issues.push(...await checkMobileLayout(page, finalUrl, screenshotPath, timestamp));
      }

      await context.close();

      const healthScore = computeHealthScore(issues);

      return {
        url: targetUrl,
        finalUrl,
        status,
        statusText,
        loadTimeMs,
        title,
        screenshotPath,
        timestamp,
        success: status >= 200 && status < 400,
        error: status >= 400 ? `HTTP status ${status} (${statusText})` : undefined,
        consoleErrors,
        pageErrors,
        retriesAttempted: attempt,
        robotsAllowed: true,
        issues,
        healthScore,
      };
    } catch (err: any) {
      lastError = err;
      await context.close().catch(() => {});
      attempt++;
      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // All retries exhausted
  return {
    url: targetUrl,
    finalUrl: targetUrl,
    status: 0,
    statusText: 'Navigation Failed',
    loadTimeMs: 0,
    title: '',
    screenshotPath: null,
    timestamp,
    success: false,
    error: `Failed after ${maxRetries} retries: ${lastError?.message ?? 'Unknown network error'}`,
    consoleErrors: [],
    pageErrors: [],
    retriesAttempted: maxRetries,
    robotsAllowed: true,
    issues: [],
    healthScore: 0,
  };
}
