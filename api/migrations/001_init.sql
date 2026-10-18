-- ==============================================================================
-- Migration: 001_init.sql
-- SiteSentinel Database Schema
-- Tables: sites, scans, issues, reports
-- ==============================================================================

-- 1. Sites Table
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL UNIQUE,
  owner_email VARCHAR(255),
  enabled BOOLEAN NOT NULL DEFAULT true,
  health_score INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Scans Table
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  final_url TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  load_time_ms INTEGER NOT NULL,
  title TEXT,
  screenshot_path TEXT,
  health_score INTEGER NOT NULL DEFAULT 100,
  issues_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Issues Table (with fingerprint and deduplication fields)
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  fingerprint VARCHAR(64) NOT NULL UNIQUE,
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  steps_to_reproduce JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'analyzed', 'pending_approval', 'rejected_by_ai', 'approved', 'rejected', 'sent', 'resolved')
  ),
  ai_analysis JSONB,
  occurrences INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for issues lookups
CREATE INDEX IF NOT EXISTS idx_issues_site_id ON issues(site_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
CREATE INDEX IF NOT EXISTS idx_issues_fingerprint ON issues(fingerprint);

-- 4. Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_approval' CHECK (
    status IN ('pending_approval', 'approved', 'rejected', 'sent')
  ),
  email_to VARCHAR(255),
  report_title TEXT NOT NULL,
  report_body TEXT NOT NULL,
  report_body_tamil TEXT,
  approved_by VARCHAR(255),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_issue_id ON reports(issue_id);
