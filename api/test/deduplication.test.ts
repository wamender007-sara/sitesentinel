import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getPool, closePool } from '../src/db/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { computeIssueFingerprint, normalizePath } from '../src/db/fingerprint.js';
import { saveScanResults } from '../src/db/repository.js';

describe('Phase 3: Database & Deduplication', () => {
  before(async () => {
    await runMigrations();
  });

  after(async () => {
    await closePool();
  });

  it('normalizes paths consistently', () => {
    assert.strictEqual(normalizePath('http://localhost:4000/test/'), '/test');
    assert.strictEqual(normalizePath('http://localhost:4000/test'), '/test');
    assert.strictEqual(normalizePath('http://localhost:4000/'), '/');
  });

  it('generates deterministic SHA256 fingerprints', () => {
    const fp1 = computeIssueFingerprint({
      url: 'http://localhost:4000/test/',
      type: 'broken_link',
      selector: '#broken-link',
    });
    const fp2 = computeIssueFingerprint({
      url: 'http://localhost:4000/test',
      type: 'broken_link',
      selector: '#broken-link',
    });
    assert.strictEqual(fp1, fp2);
    assert.strictEqual(fp1.length, 64);
  });

  it('saves scan and increments occurrences on second scan without duplicates', async () => {
    const pool = getPool();
    const testDomain = 'phase3-test.local';

    // Clean up any test domain artifacts
    await pool.query('DELETE FROM sites WHERE domain = $1', [testDomain]);

    const mockIssues = [
      {
        type: 'missing_alt',
        severity: 'medium' as const,
        title: 'Image missing alt attribute',
        description: 'img element lacks alt text',
        url: `http://${testDomain}/page1`,
        evidence: { selector: 'img#flawed' },
        stepsToReproduce: ['Navigate to page', 'Inspect img#flawed'],
      },
      {
        type: 'console_error',
        severity: 'high' as const,
        title: 'Uncaught TypeError in console',
        description: 'Cannot read properties of undefined',
        url: `http://${testDomain}/page1`,
        evidence: { selector: 'script' },
        stepsToReproduce: ['Open DevTools', 'Look at console'],
      },
    ];

    // Scan 1
    const res1 = await saveScanResults({
      url: `http://${testDomain}/page1`,
      finalUrl: `http://${testDomain}/page1`,
      statusCode: 200,
      loadTimeMs: 120,
      title: 'Test Page',
      screenshotPath: '/tmp/test.png',
      healthScore: 85,
      issues: mockIssues,
      domain: testDomain,
    });

    assert.strictEqual(res1.savedIssues.length, 2);
    assert.strictEqual(res1.savedIssues[0].occurrences, 1);
    assert.strictEqual(res1.savedIssues[1].occurrences, 1);

    // Verify DB count
    const countCheck1 = await pool.query(
      'SELECT count(*) FROM issues WHERE site_id = $1',
      [res1.scan.site_id]
    );
    assert.strictEqual(parseInt(countCheck1.rows[0].count, 10), 2);

    // Scan 2 (identical issues)
    const res2 = await saveScanResults({
      url: `http://${testDomain}/page1`,
      finalUrl: `http://${testDomain}/page1`,
      statusCode: 200,
      loadTimeMs: 110,
      title: 'Test Page',
      screenshotPath: '/tmp/test.png',
      healthScore: 85,
      issues: mockIssues,
      domain: testDomain,
    });

    assert.strictEqual(res2.savedIssues.length, 2);
    assert.strictEqual(res2.savedIssues[0].occurrences, 2);
    assert.strictEqual(res2.savedIssues[1].occurrences, 2);

    // Verify DB count remained 2 (no duplicate rows)
    const countCheck2 = await pool.query(
      'SELECT count(*) FROM issues WHERE site_id = $1',
      [res2.scan.site_id]
    );
    assert.strictEqual(parseInt(countCheck2.rows[0].count, 10), 2);

    // Scan 3 with 1 issue resolved
    const res3 = await saveScanResults({
      url: `http://${testDomain}/page1`,
      finalUrl: `http://${testDomain}/page1`,
      statusCode: 200,
      loadTimeMs: 95,
      title: 'Test Page',
      screenshotPath: '/tmp/test.png',
      healthScore: 90,
      issues: [mockIssues[0]], // mockIssues[1] is gone
      domain: testDomain,
    });

    assert.strictEqual(res3.savedIssues.length, 1);
    assert.strictEqual(res3.resolvedCount, 1);

    const resolvedIssue = await pool.query(
      'SELECT status FROM issues WHERE site_id = $1 AND type = $2',
      [res3.scan.site_id, 'console_error']
    );
    assert.strictEqual(resolvedIssue.rows[0].status, 'resolved');
  });
});
