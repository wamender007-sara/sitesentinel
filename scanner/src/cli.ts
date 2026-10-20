#!/usr/bin/env node
import { scanPage } from './scanner.js';
import { getAllowlistedStartUrls } from './allowlist.js';
import { closeBrowser } from './browser.js';
import type { ScanResult } from './types.js';

/**
 * Parses CLI arguments into an options object.
 */
function parseArgs(args: string[]): { url?: string; all?: boolean; help?: boolean } {
  const result: { url?: string; all?: boolean; help?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--url' || arg === '-u') {
      result.url = args[i + 1];
      i++;
    } else if (arg.startsWith('http://') || arg.startsWith('https://')) {
      result.url = arg;
    } else if (arg === '--all' || arg === 'scan:all') {
      result.all = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    }
  }

  return result;
}

function printUsage(): void {
  console.log(`
SiteSentinel Scanner CLI

Usage:
  npm run scan -- --url <url>      Scan a single allowlisted URL
  npm run scan:all                 Scan all start URLs from config/targets.json
  npm run scan -- --help           Show this help message

Examples:
  npm run scan -- --url http://localhost:4000/
  npm run scan:all
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help || (!options.url && !options.all)) {
    printUsage();
    process.exit(options.help ? 0 : 1);
  }

  try {
    if (options.url) {
      const result: ScanResult = await scanPage(options.url);
      console.log(JSON.stringify(result, null, 2));
    } else if (options.all) {
      const targets = getAllowlistedStartUrls();
      if (targets.length === 0) {
        console.error('No enabled start URLs found in config/targets.json.');
        process.exit(1);
      }

      console.error(`[SiteSentinel] Starting scan of ${targets.length} allowlisted target(s)...`);
      const results: ScanResult[] = [];

      for (const targetUrl of targets) {
        console.error(`[SiteSentinel] Auditing: ${targetUrl}`);
        const result = await scanPage(targetUrl);
        results.push(result);
      }

      console.log(JSON.stringify(results, null, 2));
    }
  } catch (err: any) {
    console.error(`[SiteSentinel] Unhandled CLI Error: ${err.message || err}`);
    process.exit(1);
  } finally {
    await closeBrowser();
  }
}

main();
