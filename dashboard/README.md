# /dashboard

## Overview
The SiteSentinel **Dashboard** is a Next.js web application designed for human audit operators to review findings, inspect screenshots, and approve or reject issues before external notification.

## Planned Responsibilities
- Real-time audit metrics (scanned pages, open violations, severity breakdown).
- Issue inspection modal:
  - Highlighting screenshot with zoom/pan.
  - Reproducible steps.
  - Gemini AI explanation and suggested code patch.
  - Raw axe-core violation or console trace.
- One-click approval toggle to set `status = 'approved'` (Rule 4 guardrail).
- Filter by category: Accessibility, Performance, Broken Links, Console Errors, SSL.

*Note: Feature code will be implemented in subsequent phases.*
