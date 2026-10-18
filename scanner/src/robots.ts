import type { RobotsCheckResult } from './types.js';

interface ParsedRule {
  userAgent: string;
  disallows: string[];
  allows: string[];
  crawlDelay?: number;
}

// In-memory cache mapping origin (e.g., "http://localhost:4000") to parsed rules
const robotsCache = new Map<string, ParsedRule[]>();

/**
 * Parses raw robots.txt text into structured user-agent rules.
 */
function parseRobotsTxt(content: string): ParsedRule[] {
  const lines = content.split('\n');
  const rules: ParsedRule[] = [];
  let currentAgents: string[] = [];
  let currentDisallows: string[] = [];
  let currentAllows: string[] = [];
  let currentDelay: number | undefined;

  const flushGroup = () => {
    if (currentAgents.length > 0) {
      for (const agent of currentAgents) {
        rules.push({
          userAgent: agent.toLowerCase(),
          disallows: [...currentDisallows],
          allows: [...currentAllows],
          crawlDelay: currentDelay,
        });
      }
    }
    currentAgents = [];
    currentDisallows = [];
    currentAllows = [];
    currentDelay = undefined;
  };

  for (const rawLine of lines) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;

    const [directive, ...rest] = line.split(':');
    const key = directive.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (key === 'user-agent') {
      if (currentDisallows.length > 0 || currentAllows.length > 0) {
        flushGroup();
      }
      currentAgents.push(value);
    } else if (key === 'disallow') {
      if (value) currentDisallows.push(value);
    } else if (key === 'allow') {
      if (value) currentAllows.push(value);
    } else if (key === 'crawl-delay') {
      const parsedDelay = parseFloat(value);
      if (!isNaN(parsedDelay)) currentDelay = parsedDelay;
    }
  }

  flushGroup();
  return rules;
}

/**
 * Fetches robots.txt for a given URL's origin and returns the cached rules.
 * If fetching fails (e.g. 404 or network unreachable), assumes scanning is permissible.
 */
export async function getRobotsRulesForOrigin(origin: string): Promise<ParsedRule[]> {
  if (robotsCache.has(origin)) {
    return robotsCache.get(origin)!;
  }

  const robotsUrl = `${origin}/robots.txt`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SiteSentinel-AuditBot/1.0 (+https://sitesentinel.hackathon/bot)',
      },
    });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      const rules = parseRobotsTxt(text);
      robotsCache.set(origin, rules);
      return rules;
    }
  } catch (err) {
    // Missing or unreachable robots.txt means no explicit crawl restrictions exist
  }

  robotsCache.set(origin, []);
  return [];
}

/**
 * Checks whether a given path is allowed by robots.txt according to Rule 2.
 */
export async function checkRobotsPermission(
  targetUrl: string,
  botName: string = 'sitesentinel'
): Promise<RobotsCheckResult> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { allowed: false, reason: 'Invalid target URL' };
  }

  const origin = parsed.origin;
  const pathname = parsed.pathname;
  const rules = await getRobotsRulesForOrigin(origin);

  if (rules.length === 0) {
    return { allowed: true };
  }

  // Find rules specifically matching our bot, fallback to wildcard '*'
  const specificRules = rules.find((r) => r.userAgent === botName.toLowerCase());
  const wildcardRules = rules.find((r) => r.userAgent === '*');
  const applicableRule = specificRules || wildcardRules;

  if (!applicableRule) {
    return { allowed: true };
  }

  // Check explicit Allows first
  for (const allowPath of applicableRule.allows) {
    if (pathname.startsWith(allowPath)) {
      return { allowed: true, crawlDelaySeconds: applicableRule.crawlDelay };
    }
  }

  // Check Disallow rules
  for (const disallowPath of applicableRule.disallows) {
    if (disallowPath && pathname.startsWith(disallowPath)) {
      return {
        allowed: false,
        reason: `Path "${pathname}" is blocked by robots.txt (Disallow: ${disallowPath}) for agent "${applicableRule.userAgent}"`,
        crawlDelaySeconds: applicableRule.crawlDelay,
      };
    }
  }

  return {
    allowed: true,
    crawlDelaySeconds: applicableRule.crawlDelay,
  };
}
