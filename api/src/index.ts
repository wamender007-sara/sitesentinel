import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPool } from './db/index.js';
import { saveScanResults } from './db/repository.js';
import { scanPage } from '../../scanner/src/scanner.js';
import { analyzeIssue } from './ai/analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY = process.env.API_SECRET_TOKEN || 'sitesentinel_dev_api_key_123';
const PORT = parseInt(process.env.API_PORT || '4001', 10);
const HOST = process.env.API_HOST || '0.0.0.0';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  // CORS
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Rate Limiting
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  // Swagger Documentation at /docs
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'SiteSentinel REST API',
        description: 'Automated Web Quality & Accessibility Scanner API with AI Triage',
        version: '1.0.0',
      },
      servers: [{ url: `http://localhost:${PORT}` }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Authentication hook for protected endpoints
  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    // Whitelist public endpoints
    const publicPaths = ['/health', '/docs', '/docs/json', '/docs/static'];
    if (publicPaths.some(p => req.url === p || req.url.startsWith('/docs/'))) {
      return;
    }

    const providedKey = req.headers['x-api-key'];
    if (!providedKey || providedKey !== API_KEY) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid x-api-key header',
      });
    }
  });

  // ── 1. Healthcheck ──────────────────────────────────────────────────────────
  app.get('/health', async () => {
    const pool = getPool();
    const dbRes = await pool.query('SELECT NOW()');
    return {
      status: 'healthy',
      service: 'sitesentinel-api',
      timestamp: dbRes.rows[0].now,
    };
  });

  // ── 2. Stats ────────────────────────────────────────────────────────────────
  app.get('/stats', async () => {
    const pool = getPool();
    const sitesCount = await pool.query('SELECT count(*) FROM sites WHERE enabled = true');
    const openIssues = await pool.query("SELECT count(*) FROM issues WHERE status NOT IN ('resolved', 'rejected', 'rejected_by_ai')");
    const criticalIssues = await pool.query("SELECT count(*) FROM issues WHERE severity = 'critical' AND status NOT IN ('resolved', 'rejected', 'rejected_by_ai')");
    const avgScore = await pool.query('SELECT COALESCE(AVG(health_score), 100) as avg FROM sites WHERE enabled = true');
    const pendingReports = await pool.query("SELECT count(*) FROM reports WHERE status = 'pending_approval'");

    return {
      totalSites: parseInt(sitesCount.rows[0].count, 10),
      openIssues: parseInt(openIssues.rows[0].count, 10),
      criticalIssues: parseInt(criticalIssues.rows[0].count, 10),
      averageHealthScore: Math.round(parseFloat(avgScore.rows[0].avg)),
      pendingReports: parseInt(pendingReports.rows[0].count, 10),
    };
  });

  // ── 3. Scans ────────────────────────────────────────────────────────────────
  app.post('/scans', async (req, reply) => {
    const schema = z.object({
      url: z.string().url(),
      autoAnalyze: z.boolean().optional().default(true),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation Error', details: parsed.error.issues });
    }

    try {
      // Execute scanner
      const scanResult = await scanPage(parsed.data.url);
      
      // Persist to database & deduplicate
      const saved = await saveScanResults({
        url: scanResult.url,
        finalUrl: scanResult.finalUrl,
        statusCode: scanResult.status,
        loadTimeMs: scanResult.loadTimeMs,
        title: scanResult.title,
        screenshotPath: scanResult.screenshotPath,
        healthScore: scanResult.healthScore,
        issues: scanResult.issues,
      });

      // Optionally trigger AI triage on newly found issues
      if (parsed.data.autoAnalyze) {
        for (const issue of saved.savedIssues) {
          if (issue.status === 'new') {
            await analyzeIssue(issue).catch(e => console.error(`Error analyzing issue ${issue.id}:`, e));
          }
        }
      }

      return reply.status(201).send({
        scan: saved.scan,
        healthScore: scanResult.healthScore,
        issuesDetected: saved.savedIssues.length,
        resolvedIssuesCount: saved.resolvedCount,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Scan Execution Failed', message: err.message || err });
    }
  });

  app.get('/scans', async (req) => {
    const pool = getPool();
    const query = `
      SELECT s.*, st.name as site_name, st.domain
      FROM scans s
      LEFT JOIN sites st ON s.site_id = st.id
      ORDER BY s.created_at DESC
      LIMIT 50
    `;
    const res = await pool.query(query);
    return res.rows;
  });

  app.get('/scans/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const pool = getPool();
    const scanRes = await pool.query('SELECT * FROM scans WHERE id = $1', [id]);
    if (scanRes.rowCount === 0) {
      return reply.status(404).send({ error: 'Not Found', message: 'Scan not found' });
    }

    const issuesRes = await pool.query('SELECT * FROM issues WHERE scan_id = $1', [id]);
    return {
      ...scanRes.rows[0],
      issues: issuesRes.rows,
    };
  });

  // ── 4. Sites ────────────────────────────────────────────────────────────────
  app.get('/sites', async () => {
    const pool = getPool();
    const res = await pool.query(`
      SELECT s.*, 
        (SELECT count(*) FROM issues i WHERE i.site_id = s.id AND i.status NOT IN ('resolved', 'rejected', 'rejected_by_ai')) as open_issues_count
      FROM sites s
      ORDER BY s.health_score ASC
    `);
    return res.rows;
  });

  app.get('/sites/:id/health-history', async (req, reply) => {
    const { id } = req.params as { id: string };
    const pool = getPool();
    const res = await pool.query(
      `SELECT id, health_score, issues_count, created_at 
       FROM scans 
       WHERE site_id = $1 
       ORDER BY created_at ASC`,
      [id]
    );
    return res.rows;
  });

  // ── 5. Issues ───────────────────────────────────────────────────────────────
  app.get('/issues', async (req) => {
    const pool = getPool();
    const queryParams = req.query as {
      site_id?: string;
      severity?: string;
      status?: string;
      type?: string;
      limit?: string;
      offset?: string;
    };

    let sql = `
      SELECT i.*, s.domain, s.name as site_name
      FROM issues i
      JOIN sites s ON i.site_id = s.id
      WHERE 1=1
    `;
    const values: any[] = [];

    if (queryParams.site_id) {
      values.push(queryParams.site_id);
      sql += ` AND i.site_id = $${values.length}`;
    }
    if (queryParams.severity) {
      values.push(queryParams.severity);
      sql += ` AND i.severity = $${values.length}`;
    }
    if (queryParams.status) {
      values.push(queryParams.status);
      sql += ` AND i.status = $${values.length}`;
    }
    if (queryParams.type) {
      values.push(queryParams.type);
      sql += ` AND i.type = $${values.length}`;
    }

    sql += ' ORDER BY i.last_seen_at DESC';

    const limit = Math.min(parseInt(queryParams.limit || '50', 10), 100);
    const offset = parseInt(queryParams.offset || '0', 10);
    values.push(limit, offset);
    sql += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const res = await pool.query(sql, values);
    return res.rows;
  });

  app.get('/issues/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const pool = getPool();
    const res = await pool.query(
      `SELECT i.*, s.domain, s.name as site_name, r.id as report_id, r.status as report_status, r.report_title, r.report_body
       FROM issues i
       JOIN sites s ON i.site_id = s.id
       LEFT JOIN reports r ON r.issue_id = i.id
       WHERE i.id = $1`,
      [id]
    );

    if (res.rowCount === 0) {
      return reply.status(404).send({ error: 'Not Found', message: 'Issue not found' });
    }
    return res.rows[0];
  });

  app.post('/issues/:id/analyze', async (req, reply) => {
    const { id } = req.params as { id: string };
    const pool = getPool();
    const issueRes = await pool.query('SELECT * FROM issues WHERE id = $1', [id]);
    if (issueRes.rowCount === 0) {
      return reply.status(404).send({ error: 'Not Found', message: 'Issue not found' });
    }

    const issue = issueRes.rows[0];
    const result = await analyzeIssue(issue);
    return result;
  });

  // Rule 4: Approve endpoint MUST FAIL unless status is "pending_approval"
  app.post('/issues/:id/approve', async (req, reply) => {
    const { id } = req.params as { id: string };
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const issueRes = await client.query('SELECT status FROM issues WHERE id = $1', [id]);
      if (issueRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ error: 'Not Found', message: 'Issue not found' });
      }

      const currentStatus = issueRes.rows[0].status;
      if (currentStatus !== 'pending_approval') {
        await client.query('ROLLBACK');
        return reply.status(400).send({
          error: 'Invalid State Transition',
          message: `Cannot approve issue with status "${currentStatus}". Must be "pending_approval".`,
        });
      }

      // Update issue status to approved
      await client.query("UPDATE issues SET status = 'approved' WHERE id = $1", [id]);

      // Update associated report status to approved
      const body = (req.body as any) || {};
      const approvedBy = body.approved_by || 'human_auditor';
      const updatedReport = await client.query(
        `UPDATE reports
         SET status = 'approved',
             approved_by = $1,
             approved_at = NOW(),
             report_body = COALESCE($2, report_body),
             updated_at = NOW()
         WHERE issue_id = $3
         RETURNING *`,
        [approvedBy, body.report_body || null, id]
      );

      await client.query('COMMIT');
      return {
        message: 'Issue and report successfully approved',
        issueId: id,
        report: updatedReport.rows[0] || null,
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      return reply.status(500).send({ error: 'Approval Failed', message: err.message });
    } finally {
      client.release();
    }
  });

  app.post('/issues/:id/reject', async (req, reply) => {
    const { id } = req.params as { id: string };
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const issueRes = await client.query('SELECT status FROM issues WHERE id = $1', [id]);
      if (issueRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ error: 'Not Found', message: 'Issue not found' });
      }

      await client.query("UPDATE issues SET status = 'rejected' WHERE id = $1", [id]);
      await client.query("UPDATE reports SET status = 'rejected', updated_at = NOW() WHERE issue_id = $1", [id]);

      await client.query('COMMIT');
      return { message: 'Issue marked as rejected', issueId: id };
    } catch (err: any) {
      await client.query('ROLLBACK');
      return reply.status(500).send({ error: 'Rejection Failed', message: err.message });
    } finally {
      client.release();
    }
  });

  // ── 6. Reports (n8n Integration & Approvals) ───────────────────────────────
  app.get('/reports/pending', async () => {
    const pool = getPool();
    const res = await pool.query(`
      SELECT r.*, i.url, i.severity, i.type, i.evidence, s.domain, s.owner_email
      FROM reports r
      JOIN issues i ON r.issue_id = i.id
      JOIN sites s ON i.site_id = s.id
      WHERE r.status = 'pending_approval'
      ORDER BY r.created_at ASC
    `);
    return res.rows;
  });

  app.get('/reports/approved', async () => {
    const pool = getPool();
    const res = await pool.query(`
      SELECT r.*, i.url, i.severity, i.type, i.evidence, s.domain, COALESCE(r.email_to, s.owner_email) as recipient_email
      FROM reports r
      JOIN issues i ON r.issue_id = i.id
      JOIN sites s ON i.site_id = s.id
      WHERE r.status = 'approved'
      ORDER BY r.approved_at ASC
    `);
    return res.rows;
  });

  // Rule 4: Fails unless status is "approved"
  app.post('/reports/:id/mark-sent', async (req, reply) => {
    const { id } = req.params as { id: string };
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const reportRes = await client.query('SELECT status, issue_id FROM reports WHERE id = $1', [id]);
      if (reportRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ error: 'Not Found', message: 'Report not found' });
      }

      const report = reportRes.rows[0];
      if (report.status !== 'approved') {
        await client.query('ROLLBACK');
        return reply.status(400).send({
          error: 'Invalid State Transition',
          message: `Cannot mark report as sent. Report status is "${report.status}", must be "approved".`,
        });
      }

      await client.query(
        "UPDATE reports SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1",
        [id]
      );
      await client.query(
        "UPDATE issues SET status = 'sent' WHERE id = $1",
        [report.issue_id]
      );

      await client.query('COMMIT');
      return { message: 'Report marked as sent', reportId: id };
    } catch (err: any) {
      await client.query('ROLLBACK');
      return reply.status(500).send({ error: 'Mark Sent Failed', message: err.message });
    } finally {
      client.release();
    }
  });

  return app;
}

// Standalone execution: `node dist/index.js` or `npm run dev`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const start = async () => {
    const app = await buildApp();
    try {
      await app.listen({ port: PORT, host: HOST });
      console.log(`[SiteSentinel API] Server running at http://${HOST}:${PORT}/`);
      console.log(`[SiteSentinel API] Documentation available at http://${HOST}:${PORT}/docs`);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };
  start();
}
