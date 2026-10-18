# SiteSentinel 3-Minute Live Demo Walkthrough

Follow these steps for an end-to-end hackathon presentation demonstrating automated crawling, AI root-cause analysis, human-in-the-loop approval, and delivery dispatch.

---

## Prerequisites (10 seconds)
1. Ensure the PostgreSQL container and testbed server are active:
   ```bash
   # Terminal 1: Postgres
   docker compose up -d postgres

   # Terminal 2: Testbed Application
   cd test-site
   node server.js
   # Running on http://localhost:4000/
   ```

2. Start the API and Dashboard:
   ```bash
   # Terminal 3: Fastify REST API
   cd api
   npm run dev

   # Terminal 4: Next.js Dashboard
   cd dashboard
   npm run dev
   # Open http://localhost:3000 in your browser
   ```

---

## Demo Script (3 Minutes)

### Minute 1: The Automated Audit & Defect Detection (0:00 - 1:00)
1. Open the Dashboard at `http://localhost:3000/`.
2. Click **Run Scan** in the sidebar.
3. Observe target URL: `http://localhost:4000/`. Click **Execute Audit**.
4. The scanner visits the page via headless Chromium, respects `robots.txt` and rate limits, takes a full-page screenshot, and runs 8 checks:
   - Broken link (`/broken-link-target` -> 404)
   - Missing image `alt` attribute
   - Uncaught JavaScript `TypeError` in console
   - WCAG low-contrast text violation
   - Mobile tap target sizing
5. The scan finishes: Notice the Health Score drops to **55/100**.

### Minute 2: Gemini AI Triage & De-duplication (1:00 - 2:00)
1. Click **Issues** in the sidebar:
   - Show the detected flaws.
   - Point out **Occurrences** count (re-scanning the page increments the count rather than creating duplicate clutter).
2. Click **Review Queue** (the core human-in-the-loop view):
   - Explain that Gemini triaged the issues conservatively (filtering out captchas and login walls as non-bugs).
   - Show the generated bug report: Root cause explanation, affected users, and suggested code fix.
   - Switch language toggle to **தமிழ் (Tamil)** in the bottom left sidebar to display the localized bug report draft.

### Minute 3: Strict Rule 4 Enforcement & Approved Dispatch (2:00 - 3:00)
1. Highlight **Hard Rule 4**:
   - Point out that **NO email is ever sent automatically**.
   - If someone tries to force an email send before approval, the API rejects it with HTTP 400.
2. Edit the drafted email in the Review Queue to customize the message.
3. Click **Approve & Queue for Sending**.
4. The report status transitions to `approved`.
5. In n8n, the `send-approved-reports` workflow picks up the approved report, applies rate-limiting (max 1/min), safely delivers it to the site owner via Gmail, and marks it as `sent`.

---

## Resetting Demo State
To restore initial sample data for subsequent runs:
```bash
cd api
npm run migrate
npx tsx src/db/seed.ts
```
