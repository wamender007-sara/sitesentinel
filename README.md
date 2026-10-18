# SiteSentinel

> **Autonomous Web Auditing & AI Triage Engine**  
> Proactively crawls web properties, detects functional and accessibility defects, triages root causes with Google Gemini, and delivers human-approved bug reports via n8n and Gmail.

---

## 🏛️ System Architecture

```text
┌────────────────┐      ┌─────────────────────────────┐      ┌─────────────────────────┐
│ Target Website │ <--- │  SiteSentinel Scanner Core  │ ---> │     Fastify REST API    │
│  (Allowlisted) │      │ (Playwright + 8 Checks)     │      │   (Zod + PG Repository) │
└────────────────┘      └──────────────┬──────────────┘      └────────────┬────────────┘
                                       │                                  │
                                       ▼                                  ▼
                              ┌─────────────────┐             ┌─────────────────────────┐
                              │ PostgreSQL 16   │ <---------> │ Google Gemini AI Triage │
                              │ (Deduplication) │             │ (Confidence & Scoring)  │
                              └────────┬────────┘             └─────────────────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
         ┌─────────────────────────┐       ┌─────────────────────────────┐
         │ Next.js Dark Dashboard  │       │   n8n Automation Engine     │
         │ (Human Review Queue)    │       │ (Rule 4 Approved Dispatch)  │
         └─────────────────────────┘       └──────────────┬──────────────┘
                                                          ▼
                                                  ┌──────────────┐
                                                  │ Gmail OAuth2 │
                                                  └──────────────┘
```

---

## ✨ Key Features
- **Headless Playwright Crawler**: Fast, polite crawling with strict `robots.txt` compliance and domain rate limiting (>= 2s per request).
- **8 Detection Check Modules**: Broken links (404/5xx), console errors, slow load times (>3000ms), failed sub-resources, accessibility (WCAG missing alt, low contrast), SEO meta tags, and mobile layout overflow.
- **Deterministic Deduplication**: Computes SHA-256 fingerprints `hash(domain|type|path|selector)` to update `occurrences` on recurring defects without duplicate rows.
- **Conservative Gemini AI Triage**: Distinguishes true bugs from false positives (login walls, cookie banners, captchas are ignored). Formats executive summaries, remediation steps, and bilingual drafts (English & Tamil).
- **Human-in-the-Loop Review Queue**: Full side-by-side view of captured evidence and editable email drafts.
- **Strict Rule 4 Guardrail**: The backend rejects dispatch requests unless an authorized human sets status to `approved`.
- **n8n Automation**: Scheduled daily crawls, 30-minute auditor reminder digests, and rate-limited email delivery via Gmail.

---

## 🛡️ Ethical Design Principles
1. **Passive & Read-Only**: The scanner never submits forms, never logs in, and never triggers destructive button actions.
2. **Strict Allowlist**: Scans only domains explicitly declared in `config/targets.json`.
3. **Polite Crawling**: Always respects `robots.txt` directives and limits request frequency to 1 request per 2 seconds.
4. **Human Verification**: Zero spam risk. No automated email leaves the system without explicit auditor review.

---

## 🚀 5-Step Quickstart

### 1. Clone & Configure Environment
```bash
cp .env.example .env
# Edit .env and insert your GEMINI_API_KEY and API_SECRET_TOKEN
```

### 2. Start PostgreSQL & n8n
```bash
docker compose up -d postgres n8n
```

### 3. Run Database Migrations & Seed Demo Data
```bash
cd api
npm install
npm run migrate
npx tsx src/db/seed.ts
```

### 4. Start the Fastify REST API
```bash
npm run dev
# API running at http://localhost:4001
# Interactive Swagger Documentation at http://localhost:4001/docs
```

### 5. Launch the Dashboard
In a new terminal:
```bash
cd dashboard
npm install
npm run dev
# Dashboard live at http://localhost:3000
```

---

## 🔬 Running Testbed & Test Suites
Start the built-in flawed test site:
```bash
cd test-site
node server.js
# Serves deliberate bugs on http://localhost:4000/
```

Execute all test suites across services:
```bash
# In api/
npm test
```

---

## ⚠️ Limitations & Future Work
- **Single-page Applications (SPAs)**: Currently optimizes for server-rendered and static DOM hierarchies; dynamic hydration wait times can be further expanded.
- **Multi-region Rate Limiting**: The in-memory token bucket rate limiter runs per scanner process; Redis-backed rate limiting is slated for distributed scaling.
- **Multi-channel Notifications**: Future updates will add Slack and Discord dispatch webhooks alongside Gmail.
