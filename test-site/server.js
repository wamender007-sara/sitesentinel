import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.TEST_SITE_PORT ? parseInt(process.env.TEST_SITE_PORT, 10) : 4000;

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Robots.txt
  if (pathname === '/robots.txt') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      'User-agent: *\n' +
      'Disallow: /admin\n' +
      'Disallow: /restricted/\n' +
      'Crawl-delay: 2\n'
    );
    return;
  }

  // 2. Slow loading page endpoint (2.5 second synthetic delay)
  if (pathname === '/slow' || pathname === '/slow.html') {
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SiteSentinel Testbed - Slow Loading Page</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; background: #fafafa; color: #333; }
    .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div class="card">
    <h1>Slow Response Page</h1>
    <p>This page was intentionally delayed by 2,500ms to test latency and slow TTFB detection.</p>
    <a href="/">Back to Home</a>
  </div>
</body>
</html>`);
    }, 2500);
    return;
  }

  // 3. Admin page (Disallowed by robots.txt)
  if (pathname === '/admin' || pathname === '/admin.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admin Dashboard (Restricted)</title>
</head>
<body>
  <h1>Restricted Area</h1>
  <p>This route is explicitly disallowed in robots.txt.</p>
</body>
</html>`);
    return;
  }

  // 4. Broken link target (intentional 404)
  if (pathname === '/broken-link-target') {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head><title>404 Not Found</title></head>
<body><h1>404 - Page Not Found</h1></body>
</html>`);
    return;
  }

  // 5. Index / Main test page with intentional bugs:
  // - Broken link (<a href="/broken-link-target">)
  // - Missing image alt attribute (<img src="/assets/banner.png"> without alt)
  // - JS console error (evaluates uncaught error in script)
  // - Low-contrast text (#cccccc on white)
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SiteSentinel Testbed - Flawed Audit Target</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 2rem;
      background: #f4f6f8;
      color: #222;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .bug-section {
      margin: 1.5rem 0;
      padding: 1rem;
      border-left: 4px solid #e53e3e;
      background: #fff5f5;
      border-radius: 4px;
    }
    /* Intentional accessibility flaw: Extremely low contrast ratio (~1.3:1) */
    .low-contrast-text {
      color: #d0d0d0;
      background-color: #ffffff;
      font-size: 14px;
      font-weight: 400;
      padding: 8px;
    }
    a { color: #3182ce; }
  </style>
  <script>
    // Intentional bug: Uncaught runtime console error
    window.addEventListener('DOMContentLoaded', () => {
      console.log('SiteSentinel testbed loaded');
      console.error('Uncaught TypeError: Cannot read properties of undefined (reading "executeAudit") at main.js:42:15');
    });
  </script>
</head>
<body>
  <div class="container">
    <h1>SiteSentinel Audit Testbed</h1>
    <p>This static site is pre-configured with deliberate usability, accessibility, and functional defects for verification.</p>

    <!-- Bug 1: Broken Link -->
    <div class="bug-section">
      <h3>Bug 1: Broken Link (404)</h3>
      <p>Clicking this link leads to an unhandled 404 HTTP status code:</p>
      <a href="/broken-link-target" id="broken-link">Navigate to Missing Page (404)</a>
    </div>

    <!-- Bug 2: Missing Image Alt -->
    <div class="bug-section">
      <h3>Bug 2: Accessibility Violation (Missing Alt)</h3>
      <p>This image element does not have an <code>alt</code> attribute:</p>
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23ccc'/%3E%3Ctext x='50%25' y='50%25' fill='%23666' text-anchor='middle' dy='.3em'%3ELogo%3C/text%3E%3C/svg%3E" id="flawed-image">
    </div>

    <!-- Bug 3: Low Contrast Text -->
    <div class="bug-section">
      <h3>Bug 3: WCAG Contrast Violation</h3>
      <p>The text below fails WCAG AA minimum contrast ratio (4.5:1):</p>
      <div class="low-contrast-text" id="low-contrast-sample">
        This text is nearly invisible due to low contrast (#d0d0d0 text on #ffffff background).
      </div>
    </div>

    <!-- Bug 4: Slow Page Link -->
    <div class="bug-section">
      <h3>Bug 4: Slow Loading Page (2.5s Delay)</h3>
      <p>Simulates high server latency / slow TTFB:</p>
      <a href="/slow" id="slow-page-link">Visit Slow Endpoint (/slow)</a>
    </div>

    <!-- Link to Disallowed Route -->
    <div class="bug-section">
      <h3>Robots.txt Restricted Target</h3>
      <p>Route explicitly marked with Disallow in robots.txt:</p>
      <a href="/admin" id="admin-link">Restricted Admin Area (/admin)</a>
    </div>
  </div>
</body>
</html>`);
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SiteSentinel Testbed] Running at http://localhost:${PORT}/`);
  console.log(`[SiteSentinel Testbed] Robots.txt available at http://localhost:${PORT}/robots.txt`);
});
