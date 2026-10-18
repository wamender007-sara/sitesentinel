# SiteSentinel - System Architecture & Data Flow

SiteSentinel is an automated, ethical website auditing platform designed to discover, categorize, and report critical usability, performance, and accessibility bugs. It pairs automated browser automation (Playwright + axe-core) with generative AI (Gemini) for triage, a Fastify API backed by PostgreSQL, a human-in-the-loop approval dashboard (Next.js), and an orchestration pipeline (n8n) delivering verified reports via Gmail.

---

## 1. High-Level Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                                 SITESENTINEL                                    |
+---------------------------------------------------------------------------------+

                      +---------------------+
                      | config/targets.json | (Allowlisted Domains & Rules)
                      +----------+----------+
                                 |
                                 v
                     +-----------------------+
                     |    /scanner Service   |
                     |  (Playwright Browser) |
                     +-----------+-----------+
                                 |
         +-----------------------+-----------------------+
         |                       |                       |
         v                       v                       v
  [ axe-core a11y ]    [ Console / Network ]    [ Layout / Responsive ]
  [  WCAG Rules   ]    [ Broken Links, 4xx ]    [ Screenshots / Perf  ]
         |                       |                       |
         +-----------------------+-----------------------+
                                 |
                                 v
                     +-----------------------+
                     | Gemini 1.5/2.0 Pro/Fl | (Issue Summarization, Root Cause,
                     |      AI Analysis      |  Remediation Recommendation)
                     +-----------+-----------+
                                 |
                                 v
                     +-----------------------+
                     |      /api Service     | (Fastify REST API & Validation)
                     |    port: 4000 (app)   |
                     +-----------+-----------+
                                 |
                                 v
                     +-----------------------+
                     |      PostgreSQL       |
                     |  Status: 'pending'    |
                     +-----------+-----------+
                                 |
                +----------------+----------------+
                |                                 |
                v                                 v
     +---------------------+           +---------------------+
     |     /dashboard      |           |    n8n Workflow     |
     |   (Next.js App)     |           |   Orchestration     |
     |   port: 3000        |           |   port: 5678        |
     +----------+----------+           +----------+----------+
                |                                 ^
                | Human Reviews Evidence          | Polls / Receives Hook
                | & Changes Status to 'approved'  | for status = 'approved'
                +---------------------------------+
                                                  |
                                                  v
                                       +---------------------+
                                       |      Gmail API      |
                                       |   (Formatted Audit  |
                                       |     Email Report)   |
                                       +----------+----------+
                                                  |
                                                  v
                                       +---------------------+
                                       |     Site Owner      |
                                       +---------------------+
```

---

## 2. Component Breakdown

| Directory / Module | Role & Technologies | Responsibilities |
| :--- | :--- | :--- |
| **`/scanner`** | Node.js, TypeScript, Playwright, axe-core | • Validates targets against allowlist.<br>• Respects `robots.txt` and rate limits (>=2s/req).<br>• Detects console errors, broken links, HTTP errors, SSL expiry, slow TTFB, layout shifts.<br>• Runs axe-core accessibility audit.<br>• Captures annotated full-page and element screenshots.<br>• Sends raw findings to Gemini for structuring. |
| **`/api`** | Node.js, TypeScript, Fastify, Drizzle/Prisma/pg | • Exposes RESTful endpoints for scans, issues, targets, and approval state transitions.<br>• Enforces schema validation and role-based actions.<br>• Provides healthcheck and metrics endpoints. |
| **`/dashboard`** | Next.js (App Router), TypeScript, Vanilla CSS | • Visual inspection console for operators.<br>• Shows scan runs, issues by severity, screenshots, reproduction steps.<br>• Human approval toggle: grants one-click or batch approval to send reports. |
| **`/n8n`** | n8n workflow engine (Dockerized) | • Scheduled trigger or webhook receiver from `/api`.<br>• Filters for `status = 'approved'` records only.<br>• Formats professional, accessible HTML report templates.<br>• Dispatches emails to site owners via Gmail OAuth2 / App Password.<br>• Updates database record with `notified_at` timestamp. |
| **`/test-site`** | Static HTML / Express / Vite | • Local intentionally buggy site for testing detection.<br>• Includes broken anchors, missing alt tags, contrast issues, 404 assets, and slow loading endpoints. |
| **`/config`** | JSON configuration | • `targets.json`: Allowlisted domains, scan options, and contact points. |
| **`/docs`** | Markdown documentation | • Architecture, coding standards, ethical scanning rules, and setup instructions. |

---

## 3. End-to-End Operational Lifecycle

1. **Target Selection:** Operator or cron initiates a scan for a domain configured in `config/targets.json`.
2. **Robots & Policy Check:** Scanner queries `https://<domain>/robots.txt` and validates allowed paths.
3. **Passive Navigation:** Headless Chromium opens target pages with a minimum 2-second rate limit pause between requests.
4. **Issue Detection:**
   - **Network:** Captures non-200 responses, redirects, and broken external links.
   - **Console:** Intercepts uncaught JavaScript exceptions and CSS syntax warnings.
   - **Accessibility:** Injects `axe-core` to inspect against WCAG 2.1 AA guidelines.
   - **Performance & SSL:** Inspects TLS certificate expiry and Core Web Vitals (LCP, CLS, TTFB).
   - **Mobile Layout:** Checks for viewport overflows and unclickable touch targets.
5. **Evidence Collection:** A screenshot is captured for every issue, stored with exact timestamp and DOM selector.
6. **Gemini AI Enrichment:** Raw error payloads and context are sent to Gemini to produce:
   - Plain-English executive summaries.
   - Step-by-step reproduction instructions.
   - Recommended technical code fixes.
7. **Storage:** The `/api` receives the structured issue data and inserts it into PostgreSQL with `status: 'pending_review'`.
8. **Operator Review:** An engineer opens the `/dashboard`, reviews the screenshot evidence and LLM diagnosis, and clicks **Approve**.
9. **Dispatch via n8n:** n8n retrieves approved issues, assembles an audit dossier, sends it via Gmail, and marks the issue as notified.
