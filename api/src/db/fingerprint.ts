import crypto from 'node:crypto';

/**
 * Normalizes URL path to avoid superficial mismatches (e.g., trailing slashes, default index).
 */
export function normalizePath(urlString: string): string {
  try {
    const u = new URL(urlString);
    let pathname = u.pathname.toLowerCase();
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    return pathname;
  } catch {
    return urlString.toLowerCase();
  }
}

/**
 * Computes deterministic fingerprint:
 * hash(domain + type + normalized URL path + selector or rule ID)
 */
export function computeIssueFingerprint(params: {
  url: string;
  type: string;
  selector?: string;
  ruleId?: string;
}): string {
  let domain = '';
  try {
    const u = new URL(params.url);
    domain = u.hostname.toLowerCase();
  } catch {
    domain = 'unknown';
  }

  const normalizedPath = normalizePath(params.url);
  const identifier = (params.selector || params.ruleId || 'none').trim().toLowerCase();
  const rawKey = `${domain}|${params.type.trim().toLowerCase()}|${normalizedPath}|${identifier}`;

  return crypto.createHash('sha256').update(rawKey).digest('hex');
}
