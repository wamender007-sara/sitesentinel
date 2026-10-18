import { getPool } from './index.js';
import { computeIssueFingerprint } from './fingerprint.js';

export interface SiteRecord {
  id: string;
  name: string;
  domain: string;
  owner_email?: string | null;
  enabled: boolean;
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface ScanRecord {
  id: string;
  site_id?: string | null;
  url: string;
  final_url: string;
  status_code: number;
  load_time_ms: number;
  title?: string | null;
  screenshot_path?: string | null;
  health_score: number;
  issues_count: number;
  created_at: string;
}

export interface IssueInput {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  url: string;
  evidence: {
    screenshotPath?: string | null;
    selector?: string;
    raw?: any;
    ruleId?: string;
  };
  stepsToReproduce: string[];
}

export interface IssueRecord {
  id: string;
  site_id?: string | null;
  scan_id?: string | null;
  fingerprint: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  url: string;
  evidence: any;
  steps_to_reproduce: any;
  status: string;
  ai_analysis?: any;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
}

/**
 * Ensures site exists in sites table or creates it.
 */
export async function getOrCreateSite(domain: string, name?: string, ownerEmail?: string): Promise<SiteRecord> {
  const pool = getPool();
  const cleanDomain = domain.toLowerCase().trim();
  const cleanName = name || cleanDomain;

  const res = await pool.query<SiteRecord>(
    `INSERT INTO sites (name, domain, owner_email)
     VALUES ($1, $2, $3)
     ON CONFLICT (domain) DO UPDATE
     SET name = COALESCE(EXCLUDED.name, sites.name),
         owner_email = COALESCE(EXCLUDED.owner_email, sites.owner_email),
         updated_at = NOW()
     RETURNING *`,
    [cleanName, cleanDomain, ownerEmail || null]
  );

  return res.rows[0];
}

/**
 * Saves a completed scan record and deduplicates issues.
 */
export async function saveScanResults(params: {
  url: string;
  finalUrl: string;
  statusCode: number;
  loadTimeMs: number;
  title: string;
  screenshotPath: string | null;
  healthScore: number;
  issues: IssueInput[];
  domain?: string;
}): Promise<{ scan: ScanRecord; savedIssues: IssueRecord[]; resolvedCount: number }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Identify domain & ensure site
    let domain = params.domain;
    if (!domain) {
      try {
        domain = new URL(params.url).hostname;
      } catch {
        domain = 'localhost';
      }
    }

    const siteRes = await client.query<SiteRecord>(
      `INSERT INTO sites (name, domain)
       VALUES ($1, $2)
       ON CONFLICT (domain) DO UPDATE
       SET health_score = $3, updated_at = NOW()
       RETURNING *`,
      [domain, domain.toLowerCase().trim(), params.healthScore]
    );
    const site = siteRes.rows[0];

    // 2. Insert scan record
    const scanRes = await client.query<ScanRecord>(
      `INSERT INTO scans (
        site_id, url, final_url, status_code, load_time_ms, title, screenshot_path, health_score, issues_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        site.id,
        params.url,
        params.finalUrl,
        params.statusCode,
        params.loadTimeMs,
        params.title,
        params.screenshotPath,
        params.healthScore,
        params.issues.length,
      ]
    );
    const scan = scanRes.rows[0];

    // 3. Upsert issues using deterministic fingerprint
    const savedIssues: IssueRecord[] = [];
    const activeFingerprints: string[] = [];

    for (const issue of params.issues) {
      const fingerprint = computeIssueFingerprint({
        url: issue.url,
        type: issue.type,
        selector: issue.evidence?.selector,
        ruleId: issue.evidence?.ruleId || issue.evidence?.raw?.ruleId,
      });

      activeFingerprints.push(fingerprint);

      const issueRes = await client.query<IssueRecord>(
        `INSERT INTO issues (
          site_id, scan_id, fingerprint, type, severity, title, description, url,
          evidence, steps_to_reproduce, status, occurrences, first_seen_at, last_seen_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, 'new', 1, NOW(), NOW()
        )
        ON CONFLICT (fingerprint) DO UPDATE
        SET scan_id = EXCLUDED.scan_id,
            last_seen_at = NOW(),
            occurrences = issues.occurrences + 1,
            evidence = EXCLUDED.evidence,
            steps_to_reproduce = EXCLUDED.steps_to_reproduce,
            -- If previously resolved, reopen as 'new'
            status = CASE WHEN issues.status = 'resolved' THEN 'new' ELSE issues.status END
        RETURNING *`,
        [
          site.id,
          scan.id,
          fingerprint,
          issue.type,
          issue.severity,
          issue.title,
          issue.description,
          issue.url,
          JSON.stringify(issue.evidence || {}),
          JSON.stringify(issue.stepsToReproduce || []),
        ]
      );

      savedIssues.push(issueRes.rows[0]);
    }

    // 4. Mark previously active issues for this site that were missing in this scan as 'resolved'
    let resolvedCount = 0;
    if (activeFingerprints.length > 0) {
      const resolveRes = await client.query(
        `UPDATE issues
         SET status = 'resolved'
         WHERE site_id = $1
           AND status NOT IN ('resolved', 'rejected', 'rejected_by_ai')
           AND fingerprint != ALL($2::varchar[])`,
        [site.id, activeFingerprints]
      );
      resolvedCount = resolveRes.rowCount ?? 0;
    } else {
      // If 0 issues were detected in this run, all open issues are now resolved
      const resolveRes = await client.query(
        `UPDATE issues
         SET status = 'resolved'
         WHERE site_id = $1
           AND status NOT IN ('resolved', 'rejected', 'rejected_by_ai')`,
        [site.id]
      );
      resolvedCount = resolveRes.rowCount ?? 0;
    }

    await client.query('COMMIT');
    return { scan, savedIssues, resolvedCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
