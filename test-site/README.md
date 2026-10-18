# /test-site

## Overview
The SiteSentinel **Test Site** is a controlled local web environment containing intentional real-world bugs to validate the scanner's detection capabilities during hackathon testing.

## Planned Test Cases
1. **Accessibility (`accessibility.html`):**
   - Images without `alt` attributes.
   - Low-contrast text failing WCAG AA standards.
   - Unlabeled form fields and empty button elements.
2. **Broken Links (`broken-links.html`):**
   - Dead internal hyperlinks (`href="/non-existent-page"` returning 404).
   - Broken image sources and missing CSS stylesheets.
3. **Console & Runtime Errors (`console-errors.html`):**
   - Uncaught JavaScript errors during `window.onload`.
   - Broken third-party script loading.
4. **Performance & Layout (`performance.html`):**
   - Large unoptimized images blocking LCP.
   - Viewport layout overflow on mobile screens (`375px` width).

*Note: Test site HTML pages and runner will be implemented in subsequent phases.*
