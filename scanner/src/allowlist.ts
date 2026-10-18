import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TargetConfig, TargetsFile } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard path to config/targets.json from scanner/src/
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '../../config/targets.json');

/**
 * Loads and parses the allowlist configuration file.
 * Enforces Rule 3 (Only scan domains listed in config/targets.json).
 */
export function loadAllowlist(configPath: string = DEFAULT_CONFIG_PATH): TargetsFile {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Target allowlist configuration not found at: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as TargetsFile;
}

/**
 * Validates whether a target URL is explicitly authorized in the allowlist.
 * Returns validation outcome along with matched target metadata.
 */
export function validateUrlAgainstAllowlist(
  rawUrl: string,
  configPath: string = DEFAULT_CONFIG_PATH
): { allowed: boolean; target?: TargetConfig; reason?: string } {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (err) {
    return {
      allowed: false,
      reason: `Invalid URL format: "${rawUrl}"`,
    };
  }

  const config = loadAllowlist(configPath);
  const normalizedProtocol = parsedUrl.protocol.replace(':', '');
  const host = parsedUrl.host.toLowerCase(); // includes port if non-default, e.g. localhost:4000
  const hostname = parsedUrl.hostname.toLowerCase(); // e.g. localhost

  // Search through all enabled targets
  for (const target of config.targets) {
    if (!target.enabled) continue;

    const targetDomain = target.domain.toLowerCase();
    const isDomainMatch = host === targetDomain || hostname === targetDomain;
    const isProtocolMatch = target.allowedProtocols.includes(normalizedProtocol);

    if (isDomainMatch) {
      if (!isProtocolMatch) {
        return {
          allowed: false,
          target,
          reason: `Protocol "${normalizedProtocol}" is not permitted for target "${target.name}". Allowed: ${target.allowedProtocols.join(', ')}`,
        };
      }
      return { allowed: true, target };
    }
  }

  return {
    allowed: false,
    reason: `Domain "${host}" is not present in the allowlist (config/targets.json). Rule 3 prohibits scanning unlisted hosts.`,
  };
}

/**
 * Retrieves all initial scan entrypoints from enabled targets.
 */
export function getAllowlistedStartUrls(configPath: string = DEFAULT_CONFIG_PATH): string[] {
  const config = loadAllowlist(configPath);
  const urls: string[] = [];

  for (const target of config.targets) {
    if (target.enabled && Array.isArray(target.startUrls)) {
      urls.push(...target.startUrls);
    }
  }

  return urls;
}
