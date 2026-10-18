# /scanner

## Overview
The SiteSentinel **Scanner** service is a headless Playwright + axe-core crawling engine designed for ethical, passive web health inspection.

## Planned Responsibilities
- Allowlist validation (`config/targets.json`) and `robots.txt` rule adherence.
- Strict rate limiting: >= 2,000ms delay per domain request.
- Issue detection:
  - WCAG 2.1 AA accessibility violations via `@axe-core/playwright`.
  - HTTP errors (4xx / 5xx) and broken hyperlink detection.
  - Runtime JavaScript console errors and uncaught exceptions.
  - Page load performance & Core Web Vitals (LCP, CLS, TTFB).
  - SSL certificate validity and expiration checks.
  - Mobile viewport layout overflow.
- Screenshot and DOM evidence collection.
- Integration with Google Gemini API for automated triage and remediation steps.
- Dispatching payload to the Fastify `/api` service.

*Note: Feature code will be implemented in subsequent phases.*
