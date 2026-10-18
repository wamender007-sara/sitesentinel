# SiteSentinel - Rules of Engagement & Engineering Guardrails

These 7 core rules govern the SiteSentinel codebase and architecture. Every contributor, pull request, and automated workflow **must** adhere strictly to these constraints across all development stages.

---

### Rule 1: Read-Only Scanning Only
* **Directive:** Under no circumstances shall the crawler interact destructively with target applications.
* **Requirements:**
  * Only perform `GET` requests and passive page navigation.
  * **Never** auto-submit forms, trigger `POST`/`PUT`/`DELETE` mutations, click buttons labeled "Delete", "Submit", "Purchase", or execute state-modifying actions.
  * **Never** bypass authentication, submit login credentials, or test brute-force vectors.
  * Only inspect visible DOM trees, network responses, accessibility trees, and browser console messages.

---

### Rule 2: Respect `robots.txt` & Polite Rate Limiting
* **Directive:** Scan ethically without burdening site infrastructure.
* **Requirements:**
  * Fetch and parse `robots.txt` before scanning any domain. Disallowed routes must be strictly excluded.
  * Enforce an absolute rate limit: **maximum 1 request per 2 seconds (>= 2000ms delay) per domain**.
  * Use a identifiable User-Agent string: `SiteSentinel-AuditBot/1.0 (+https://sitesentinel.hackathon/bot)`.
  * Support instant abort if an HTTP 429 (Too Many Requests) or 503 (Service Unavailable) status is encountered.

---

### Rule 3: Allowlist Target Enforcement (`config/targets.json`)
* **Directive:** Never scan any domain without explicit prior configuration.
* **Requirements:**
  * All scan jobs must validate the target hostname against `config/targets.json`.
  * If a URL redirects to an external, unlisted domain, the scanner must halt navigation immediately and record the redirection without crawling further.
  * The allowlist must include owner contact information and maximum crawl depth limits.

---

### Rule 4: Mandatory Human-in-the-Loop for Outbound Communications
* **Directive:** Zero autonomous emails.
* **Requirements:**
  * When issues are detected, they are saved in PostgreSQL with `status = "pending_review"`.
  * No email or webhook notification may be dispatched unless an operator explicitly updates the status to `"approved"` via the SiteSentinel Dashboard.
  * Database queries driving the n8n dispatch pipeline must strictly filter by `WHERE status = 'approved' AND notified_at IS NULL`.
  * An immutable audit log must record which operator approved the report and when.

---

### Rule 5: Verifiable Evidence for Every Finding
* **Directive:** Every reported bug or accessibility flaw must be undeniable and reproducible.
* **Requirements:**
  * Every issue entry must capture:
    1. Exact URL and timestamp.
    2. Categorization (Accessibility, Broken Link, Console Error, Performance, SSL, Mobile Layout).
    3. High-resolution screenshot highlighting the offending element (stored in a designated artifacts directory).
    4. Exact reproduction steps (e.g., viewport size, user agent, browser engine, selector path).
    5. Raw axe-core violation payload or HTTP status/console stack trace.

---

### Rule 6: Zero Secret Leakage & Strict Configuration Management
* **Directive:** Protect all credentials, tokens, and keys.
* **Requirements:**
  * Never commit `.env`, credentials, or production secrets to Git.
  * Always provide an updated `.env.example` with clear documentation for all required variables.
  * Validate environment configuration at runtime during service startup (fail fast if variables are missing).

---

### Rule 7: Clean, Typed, Modular Architecture
* **Directive:** Maintain hackathon velocity without sacrificing engineering quality.
* **Requirements:**
  * TypeScript with `strict: true` across all services.
  * Favor small, single-responsibility functions (< 30 lines where practical).
  * Every public module and API endpoint must include explicit JSDoc comments explaining purpose, parameters, and return types.
  * Separation of concerns: Keep crawler logic, LLM summarization, API endpoints, and UI presentation cleanly decoupled.
