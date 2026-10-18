/**
 * Check: HTTP Error Status
 * Severity: high (4xx) | critical (5xx)
 *
 * Flags pages that returned an HTTP error status code.
 */
import type { Issue } from '../types.js';

/**
 * Returns an Issue if the HTTP status is >= 400.
 *
 * @param url        The page URL.
 * @param status     HTTP status code returned by the page.
 * @param statusText HTTP status text.
 * @param timestamp  ISO timestamp of the scan.
 */
export function checkHttpStatus(
  url: string,
  status: number,
  statusText: string,
  timestamp: string,
): Issue[] {
  if (status > 0 && status < 400) return [];

  const is5xx = status >= 500;
  const severity = is5xx ? 'critical' : 'high';
  const category = is5xx ? 'Server Error' : 'Client Error';

  return [
    {
      type: 'http_error',
      severity,
      title: `HTTP ${status} – ${category}`,
      description:
        `The page returned an HTTP ${status} (${statusText}) status code. ` +
        (is5xx
          ? 'Server errors indicate a backend failure that prevents serving content.'
          : 'Client errors may indicate a broken link, missing resource, or misconfiguration.'),
      url,
      evidence: {
        raw: { status, statusText },
      },
      stepsToReproduce: [
        `Navigate to ${url} in a browser or via curl.`,
        `Observe the HTTP response status: ${status} ${statusText}.`,
      ],
      detectedAt: timestamp,
    },
  ];
}
