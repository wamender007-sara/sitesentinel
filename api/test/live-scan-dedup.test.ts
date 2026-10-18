import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { scanPage } from '../../scanner/src/scanner.js';
import { closeBrowser } from '../../scanner/src/browser.js';
import { getPool, closePool } from '../src/db/index.js';
import { saveScanResults } from '../src/db/repository.js';
import { runMigrations } from '../src/db/migrate.js';

describe('Phase 3 E2E: Scanner Live Deduplication against Test-Site', () => {
  before(async () => {
    await runMigrations();
  });

  after(async () => {
    await closeBrowser();
    await closePool();
  });

  it('scans test-site twice, shows occurrences = 2 and no duplicate rows', async () => {
    const pool = getPool();
    const testUrl = 'http://localhost:4000/';

    // Reset database state for localhost domain
    await pool.query("DELETE FROM sites WHERE domain = 'localhost'");

    // Scan 1
    console.log('[Live Test] Running Scan 1 on http://localhost:4000/ ...');
    const result1 = await scanPage(testUrl);
    assert.strictEqual(result1.success, true);
    assert.ok(result1.issues.length > 0, 'Expected detection checks to find issues');

    const save1 = await saveScanResults({
      url: result1.url,
      finalUrl: result1.finalUrl,
      statusCode: result1.status,
      loadTimeMs: result1.loadTimeMs,
      title: result1.title,
      screenshotPath: result1.screenshotPath,
      healthScore: result1.healthScore,
      issues: result1.issues,
      domain: 'localhost',
    });

    const siteId = save1.scan.site_id;
    const countCheck1 = await pool.query(
      'SELECT count(*) FROM issues WHERE site_id = $1',
      [siteId]
    );
    const initialIssueCount = parseInt(countCheck1.rows[0].count, 10);
    console.log(`[Live Test] Scan 1 stored ${initialIssueCount} unique issues.`);
    assert.ok(initialIssueCount > 0);

    // Verify all initial issues have occurrences = 1
    const occurrencesCheck1 = await pool.query(
      'SELECT occurrences FROM issues WHERE site_id = $1',
      [siteId]
    );
    for (const row of occurrencesCheck1.rows) {
      assert.strictEqual(row.occurrences, 1);
    }

    // Scan 2 (exact same page crawled live again)
    console.log('[Live Test] Running Scan 2 on http://localhost:4000/ ...');
    const result2 = await scanPage(testUrl);
    assert.strictEqual(result2.success, true);

    const save2 = await saveScanResults({
      url: result2.url,
      finalUrl: result2.finalUrl,
      statusCode: result2.status,
      loadTimeMs: result2.loadTimeMs,
      title: result2.title,
      screenshotPath: result2.screenshotPath,
      healthScore: result2.healthScore,
      issues: result2.issues,
      domain: 'localhost',
    });

    // Check no duplicate rows inserted
    const countCheck2 = await pool.query(
      'SELECT count(*) FROM issues WHERE site_id = $1',
      [siteId]
    );
    const finalIssueCount = parseInt(countCheck2.rows[0].count, 10);
    console.log(`[Live Test] Scan 2 total issues count: ${finalIssueCount} (Scan 1 had ${initialIssueCount})`);
    assert.strictEqual(finalIssueCount, initialIssueCount, 'No duplicate rows should be created');

    // Check occurrences incremented to 2
    const occurrencesCheck2 = await pool.query(
      'SELECT type, occurrences, fingerprint FROM issues WHERE site_id = $1',
      [siteId]
    );
    console.log('[Live Test] Issue occurrences after Scan 2:');
    for (const row of occurrencesCheck2.rows) {
      console.log(`  - Issue type: ${row.type}, occurrences: ${row.occurrences}`);
      assert.strictEqual(row.occurrences, 2, `Expected occurrences = 2 for ${row.type}`);
    }
  });
});
