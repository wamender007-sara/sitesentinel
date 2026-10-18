export interface Issue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  url: string;
  evidence: {
    screenshotPath?: string | null;
    selector?: string;
    raw?: any;
  };
  stepsToReproduce: string[];
  detectedAt: string; // ISO timestamp
}

/**
 * Compute a health score (0-100) based on an array of issues.
 * Starts at 100 and subtracts points per issue severity.
 */
export function healthScore(issues: Issue[]): number {
  let score = 100;
  for (const i of issues) {
    switch (i.severity) {
      case 'critical':
        score -= 15;
        break;
      case 'high':
        score -= 10;
        break;
      case 'medium':
        score -= 5;
        break;
      case 'low':
        score -= 2;
        break;
    }
  }
  return Math.max(0, score);
}
