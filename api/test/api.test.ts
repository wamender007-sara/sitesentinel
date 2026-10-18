import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { buildApp } from '../src/index.js';
import { getPool, closePool } from '../src/db/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { FastifyInstance } from 'fastify';

describe('Phase 5: REST API Integration & Rule 4 Approval Flow', () => {
  let app: FastifyInstance;
  const apiKey = process.env.API_SECRET_TOKEN || 'sitesentinel_dev_api_key_123';

  before(async () => {
    await runMigrations();
    app = await buildApp();
    await app.ready();
  });

  after(async () => {
    await app.close();
    await closePool();
  });

  it('GET /health succeeds publicly without API key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.status, 'healthy');
  });

  it('GET /stats rejects unauthorized request without x-api-key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/stats',
    });
    assert.strictEqual(res.statusCode, 401);
  });

  it('GET /stats succeeds with valid x-api-key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/stats',
      headers: { 'x-api-key': apiKey },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(typeof body.totalSites === 'number');
    assert.ok(typeof body.averageHealthScore === 'number');
  });

  it('enforces Rule 4: approve fails if issue status is not pending_approval', async () => {
    const pool = getPool();
    // Insert a site and issue in 'new' status
    const siteRes = await pool.query(
      "INSERT INTO sites (name, domain) VALUES ('API Rule 4 Test', 'apirule4.local') ON CONFLICT (domain) DO UPDATE SET name = 'API Rule 4 Test' RETURNING id"
    );
    const siteId = siteRes.rows[0].id;

    const issueRes = await pool.query(
      `INSERT INTO issues (site_id, fingerprint, type, severity, title, description, url, status)
       VALUES ($1, 'rule4_fp_new', 'console_error', 'high', 'Test Error', 'Desc', 'http://apirule4.local', 'new')
       ON CONFLICT (fingerprint) DO UPDATE SET status = 'new'
       RETURNING id`,
      [siteId]
    );
    const issueId = issueRes.rows[0].id;

    // Attempt to approve directly from 'new' -> MUST FAIL
    const approveFail = await app.inject({
      method: 'POST',
      url: `/issues/${issueId}/approve`,
      headers: { 'x-api-key': apiKey },
      payload: { approved_by: 'QA Lead' },
    });

    assert.strictEqual(approveFail.statusCode, 400);
    const failJson = JSON.parse(approveFail.body);
    assert.strictEqual(failJson.error, 'Invalid State Transition');
  });

  it('enforces Rule 4: successfully approves when issue is pending_approval and enables mark-sent', async () => {
    const pool = getPool();
    const siteRes = await pool.query("SELECT id FROM sites WHERE domain = 'apirule4.local'");
    const siteId = siteRes.rows[0].id;

    // Insert issue in 'pending_approval' with associated report
    const issueRes = await pool.query(
      `INSERT INTO issues (site_id, fingerprint, type, severity, title, description, url, status)
       VALUES ($1, 'rule4_fp_pending', 'broken_link', 'medium', 'Pending Link', 'Desc', 'http://apirule4.local', 'pending_approval')
       ON CONFLICT (fingerprint) DO UPDATE SET status = 'pending_approval'
       RETURNING id`,
      [siteId]
    );
    const issueId = issueRes.rows[0].id;

    const reportRes = await pool.query(
      `INSERT INTO reports (issue_id, status, report_title, report_body)
       VALUES ($1, 'pending_approval', 'Report for Pending Link', 'Details of broken link')
       RETURNING id`,
      [issueId]
    );
    const reportId = reportRes.rows[0].id;

    // 1. Cannot mark-sent while report is still 'pending_approval'
    const sendBeforeApprove = await app.inject({
      method: 'POST',
      url: `/reports/${reportId}/mark-sent`,
      headers: { 'x-api-key': apiKey },
    });
    assert.strictEqual(sendBeforeApprove.statusCode, 400);

    // 2. Approve issue & report
    const approveSuccess = await app.inject({
      method: 'POST',
      url: `/issues/${issueId}/approve`,
      headers: { 'x-api-key': apiKey },
      payload: { approved_by: 'Security Auditor' },
    });
    assert.strictEqual(approveSuccess.statusCode, 200);

    // Verify issue status updated to 'approved'
    const checkIssue = await pool.query('SELECT status FROM issues WHERE id = $1', [issueId]);
    assert.strictEqual(checkIssue.rows[0].status, 'approved');

    // Verify report status updated to 'approved'
    const checkReport = await pool.query('SELECT status, approved_by FROM reports WHERE id = $1', [reportId]);
    assert.strictEqual(checkReport.rows[0].status, 'approved');
    assert.strictEqual(checkReport.rows[0].approved_by, 'Security Auditor');

    // 3. Now mark-sent succeeds
    const sendAfterApprove = await app.inject({
      method: 'POST',
      url: `/reports/${reportId}/mark-sent`,
      headers: { 'x-api-key': apiKey },
    });
    assert.strictEqual(sendAfterApprove.statusCode, 200);

    const checkSentReport = await pool.query('SELECT status, sent_at FROM reports WHERE id = $1', [reportId]);
    assert.strictEqual(checkSentReport.rows[0].status, 'sent');
    assert.ok(checkSentReport.rows[0].sent_at !== null);
  });
});
