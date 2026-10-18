import { getPool, closePool } from './index.js';
import { runMigrations } from './migrate.js';
import { computeIssueFingerprint } from './fingerprint.js';

export async function seedDemoData() {
  await runMigrations();
  const pool = getPool();
  const client = await pool.connect();

  console.log('[Seed] Seeding realistic demo data for SiteSentinel...');

  try {
    await client.query('BEGIN');

    // 1. Seed Sites
    const sitesData = [
      {
        name: 'Local Testbed Application',
        domain: 'localhost',
        owner_email: 'qa-lead@sitesentinel.local',
        health_score: 55,
      },
      {
        name: 'College Student Portal',
        domain: 'portal.college.edu',
        owner_email: 'admin@college.edu',
        health_score: 82,
      },
      {
        name: 'Campus Library Catalog',
        domain: 'library.campus.org',
        owner_email: 'webmaster@library.campus.org',
        health_score: 94,
      },
    ];

    const siteIds: Record<string, string> = {};

    for (const s of sitesData) {
      const res = await client.query(
        `INSERT INTO sites (name, domain, owner_email, health_score, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (domain) DO UPDATE
         SET name = EXCLUDED.name,
             owner_email = EXCLUDED.owner_email,
             health_score = EXCLUDED.health_score,
             updated_at = NOW()
         RETURNING id`,
        [s.name, s.domain, s.owner_email, s.health_score]
      );
      siteIds[s.domain] = res.rows[0].id;
    }

    // 2. Seed 30 Days of Scans for each site
    const now = Date.now();
    for (const [domain, siteId] of Object.entries(siteIds)) {
      for (let day = 30; day >= 0; day--) {
        const scanDate = new Date(now - day * 24 * 60 * 60 * 1000);
        const baseScore = domain === 'localhost' ? 55 : domain === 'portal.college.edu' ? 82 : 94;
        const variance = Math.floor(Math.sin(day) * 6);
        const healthScore = Math.max(20, Math.min(100, baseScore + variance));
        const issuesCount = Math.max(1, Math.round((100 - healthScore) / 8));

        await client.query(
          `INSERT INTO scans (site_id, url, final_url, status_code, load_time_ms, title, health_score, issues_count, created_at)
           VALUES ($1, $2, $3, 200, $4, $5, $6, $7, $8)`,
          [
            siteId,
            `http://${domain}/`,
            `http://${domain}/`,
            220 + (day % 5) * 40,
            `${domain} Home`,
            healthScore,
            issuesCount,
            scanDate.toISOString(),
          ]
        );
      }
    }

    // 3. Seed Realistic Issues & Approvals for localhost
    const localSiteId = siteIds['localhost'];
    const issuesData = [
      {
        type: 'broken_link',
        severity: 'high',
        title: 'Broken navigation link returned 404 Not Found',
        description: 'Anchor points to /broken-link-target which responds with 404 HTTP status.',
        url: 'http://localhost:4000/',
        evidence: { selector: '#broken-link', target: '/broken-link-target' },
        steps: ['Visit home page', 'Click on "Navigate to Missing Page"', 'Observe 404 response'],
        status: 'pending_approval',
        ai_analysis: {
          is_real_bug: true,
          confidence: 0.98,
          category: 'functional',
          severity: 'high',
          summary: 'Critical 404 broken link discovered on main page.',
          plain_english_explanation: 'Visitors clicking this link will hit a dead end, damaging site credibility.',
          suggested_fix: 'Update the href attribute or restore the missing page route.',
          affected_users: 'All prospective users following the primary navigation flow.',
          report_title: 'SiteSentinel Bug Report: Broken Link at /broken-link-target',
          report_body: '## Issue Summary\nA broken link was detected on `http://localhost:4000/`.\n\n### Impact\nUsers encountering 404 errors experience severe disruption.\n\n### Suggested Fix\nEnsure `/broken-link-target` points to an active route.',
          report_body_tamil: '## சுருக்கம்\nமுக்கிய பக்கத்தில் உடைந்த இணைப்பு கண்டறியப்பட்டது (404 பிழை).'
        }
      },
      {
        type: 'a11y_missing_alt',
        severity: 'medium',
        title: 'Image missing required descriptive alt attribute',
        description: 'img#flawed-image lacks alt text, violating WCAG 1.1.1 (Non-text Content).',
        url: 'http://localhost:4000/',
        evidence: { selector: 'img#flawed-image' },
        steps: ['Inspect home page logo', 'Check alt attribute'],
        status: 'pending_approval',
        ai_analysis: {
          is_real_bug: true,
          confidence: 0.94,
          category: 'accessibility',
          severity: 'medium',
          summary: 'Missing image alt attribute violates accessibility standards.',
          plain_english_explanation: 'Screen reader users cannot perceive what the image depicts.',
          suggested_fix: 'Add descriptive alt text to the img element.',
          affected_users: 'Visually impaired users using screen reader software.',
          report_title: 'Accessibility Violation: Missing alt on #flawed-image',
          report_body: '## Issue Summary\nAn image on `http://localhost:4000/` lacks an `alt` attribute.\n\n### Fix\nSpecify `alt="Organization Logo"` to comply with WCAG 2.1 AA.',
          report_body_tamil: '## சுருக்கம்\nபடத்திற்கான மாற்று உரை (alt attribute) இல்லை.'
        }
      },
      {
        type: 'console_error',
        severity: 'critical',
        title: 'Uncaught TypeError in client JavaScript bundle',
        description: 'Uncaught TypeError: Cannot read properties of undefined (reading "executeAudit").',
        url: 'http://localhost:4000/',
        evidence: { selector: 'script', error: 'Uncaught TypeError' },
        steps: ['Load page in browser', 'Open developer console', 'Observe uncaught TypeError'],
        status: 'approved',
        ai_analysis: {
          is_real_bug: true,
          confidence: 0.99,
          category: 'functional',
          severity: 'critical',
          summary: 'Uncaught JavaScript runtime exception halts script execution.',
          plain_english_explanation: 'A null-pointer exception halts execution of subsequent scripts.',
          suggested_fix: 'Add optional chaining `obj?.executeAudit()` or ensure initialization.',
          affected_users: 'All visitors executing client-side interactivity.',
          report_title: 'Critical Flaw: Uncaught TypeError in main bundle',
          report_body: '## Issue Summary\nAn unhandled JavaScript TypeError was thrown during DOMContentLoaded.',
        }
      }
    ];

    for (const item of issuesData) {
      const fingerprint = computeIssueFingerprint({
        url: item.url,
        type: item.type,
        selector: item.evidence.selector,
      });

      const issueRes = await client.query(
        `INSERT INTO issues (
          site_id, fingerprint, type, severity, title, description, url,
          evidence, steps_to_reproduce, status, ai_analysis, occurrences, last_seen_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 3, NOW())
        ON CONFLICT (fingerprint) DO UPDATE
        SET status = EXCLUDED.status,
            ai_analysis = EXCLUDED.ai_analysis,
            last_seen_at = NOW()
        RETURNING id`,
        [
          localSiteId,
          fingerprint,
          item.type,
          item.severity,
          item.title,
          item.description,
          item.url,
          JSON.stringify(item.evidence),
          JSON.stringify(item.steps),
          item.status,
          JSON.stringify(item.ai_analysis),
        ]
      );

      const issueId = issueRes.rows[0].id;

      // Seed reports
      await client.query(
        `INSERT INTO reports (issue_id, status, report_title, report_body, report_body_tamil, approved_by, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [
          issueId,
          item.status,
          item.ai_analysis.report_title,
          item.ai_analysis.report_body,
          item.ai_analysis.report_body_tamil || null,
          item.status === 'approved' ? 'Lead Auditor' : null,
          item.status === 'approved' ? new Date().toISOString() : null,
        ]
      );
    }

    await client.query('COMMIT');
    console.log('[Seed] Demo data seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed] Seeding failed:', err);
    throw err;
  } finally {
    client.release();
    await closePool();
  }
}

if (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js')) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
