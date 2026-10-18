# /api

## Overview
The SiteSentinel **API** service is a lightweight, typed Fastify backend providing endpoints for scan management, issue ingestion, approval transitions, and metrics.

## Planned Responsibilities
- Fastify REST endpoints:
  - `POST /scans` - Trigger or record a new crawl run.
  - `GET /scans` - List previous and active audits.
  - `POST /issues` - Ingest categorized issues with evidence and Gemini triage results.
  - `GET /issues` - Fetch issues with filters (by target, severity, category, approval status).
  - `PATCH /issues/:id/approve` - Human-in-the-loop approval endpoint (sets `status = 'approved'`).
  - `PATCH /issues/:id/reject` - Mark false positives as rejected.
  - `GET /targets` - Read configured allowlist targets.
- PostgreSQL database interactions with typed schemas.
- Healthcheck endpoint (`GET /health`).

*Note: Feature code will be implemented in subsequent phases.*
