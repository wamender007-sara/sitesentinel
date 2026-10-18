# /n8n

## Overview
The SiteSentinel **n8n** directory holds workflow definitions, templates, and orchestration configurations for automated email delivery of approved audit reports.

## Planned Responsibilities
- Automated polling of PostgreSQL database or listening to Fastify webhooks.
- Strict filter: `WHERE status = 'approved' AND notified_at IS NULL` (Enforcing Rule 4).
- Formatting structured HTML email reports with issue summaries, severity badges, and reproduction steps.
- Dispatch via Gmail node (OAuth2 or App Password).
- Updating record status to set `notified_at = NOW()`.
- Exported JSON workflow definitions to import directly into n8n instances.

*Note: Feature code and workflow JSONs will be implemented in subsequent phases.*
