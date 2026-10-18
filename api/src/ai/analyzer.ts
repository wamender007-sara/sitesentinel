import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_TRIAGE_PROMPT, buildIssueUserPrompt } from './prompts.js';
import { getPool } from '../db/index.js';

export const AiAnalysisSchema = z.object({
  is_real_bug: z.boolean(),
  confidence: z.number().min(0).max(1),
  category: z.enum(['functional', 'accessibility', 'performance', 'security', 'seo', 'visual']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  summary: z.string().min(5),
  plain_english_explanation: z.string().min(10),
  suggested_fix: z.string().min(10),
  affected_users: z.string().min(5),
  report_title: z.string().min(5),
  report_body: z.string().min(20),
  report_body_tamil: z.string().optional(),
});

export type AiAnalysis = z.infer<typeof AiAnalysisSchema>;

/**
 * Extracts and parses JSON from raw LLM output, handling markdown code fences.
 */
export function extractJsonFromResponse(rawText: string): any {
  const trimmed = rawText.trim();
  // Strip markdown ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const target = codeBlockMatch ? codeBlockMatch[1] : trimmed;
  return JSON.parse(target);
}

/**
 * Generates a mock analysis for environments without an active GEMINI_API_KEY.
 */
export function generateMockAnalysis(issue: {
  type: string;
  severity: string;
  title: string;
  description: string;
  url: string;
}, translateTamil = false): AiAnalysis {
  const isFalsePositive = issue.type.includes('login') || issue.type.includes('cookie') || issue.type.includes('captcha');
  const is_real_bug = !isFalsePositive;
  const confidence = is_real_bug ? 0.95 : 0.85;

  let category: AiAnalysis['category'] = 'functional';
  if (issue.type.includes('a11y') || issue.type.includes('alt')) category = 'accessibility';
  else if (issue.type.includes('slow') || issue.type.includes('load')) category = 'performance';
  else if (issue.type.includes('seo') || issue.type.includes('meta')) category = 'seo';
  else if (issue.type.includes('mobile') || issue.type.includes('layout')) category = 'visual';

  const severity = (['low', 'medium', 'high', 'critical'].includes(issue.severity) 
    ? issue.severity 
    : 'medium') as AiAnalysis['severity'];

  return {
    is_real_bug,
    confidence,
    category,
    severity,
    summary: `${issue.title} detected on ${issue.url}.`,
    plain_english_explanation: `The automated scanner identified ${issue.description}. This can degrade user experience or search engine indexing.`,
    suggested_fix: `Inspect the offending element at ${issue.url} and remediate according to modern web guidelines.`,
    affected_users: category === 'accessibility' ? 'Assistive technology users and screen readers' : 'All web visitors',
    report_title: `SiteSentinel Bug Report: ${issue.title}`,
    report_body: `## Summary\n${issue.title} was detected on \`${issue.url}\`.\n\n### Details\n${issue.description}\n\n### Recommended Remediation\nInspect the element and apply necessary fixes.`,
    report_body_tamil: translateTamil ? `## சுருக்கம்\n\`${issue.url}\` பக்கத்தில் ${issue.title} கண்டறியப்பட்டது.` : undefined,
  };
}

export interface AnalyzeOptions {
  apiKey?: string;
  modelName?: string;
  pageTextExcerpt?: string;
  translateTamil?: boolean;
  forceMock?: boolean;
}

/**
 * Evaluates an issue with Gemini, applies zod schema validation, retries once on error,
 * and handles database status transition and caching.
 */
export async function analyzeIssue(
  issue: {
    id?: string;
    fingerprint?: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    url: string;
    evidence: any;
    stepsToReproduce: string[];
    ai_analysis?: any;
  },
  options: AnalyzeOptions = {}
): Promise<{
  analysis: AiAnalysis;
  status: 'pending_approval' | 'rejected_by_ai';
  cached: boolean;
}> {
  // 1. Check existing cached analysis
  if (issue.ai_analysis && issue.ai_analysis.confidence !== undefined) {
    try {
      const parsed = AiAnalysisSchema.parse(issue.ai_analysis);
      const cachedStatus = (parsed.is_real_bug && parsed.confidence >= 0.7) ? 'pending_approval' : 'rejected_by_ai';
      return { analysis: parsed, status: cachedStatus, cached: true };
    } catch {
      // Incomplete cache, re-analyze
    }
  }

  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const modelName = options.modelName || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const translateTamil = options.translateTamil ?? (process.env.TRANSLATE_TAMIL === 'true');

  let analysis: AiAnalysis | null = null;

  if (options.forceMock || !apiKey || apiKey === 'your_gemini_api_key_here') {
    if (!options.forceMock) {
      console.warn('[Gemini AI] No valid GEMINI_API_KEY found in environment. Falling back to deterministic mock analyzer.');
    }
    analysis = generateMockAnalysis(issue, translateTamil);
  } else {
    const ai = new GoogleGenAI({ apiKey });
    const userPrompt = buildIssueUserPrompt({
      issue,
      pageTextExcerpt: options.pageTextExcerpt,
      translateTamil,
    });

    let attempts = 0;
    let lastError: any = null;

    while (attempts < 2 && !analysis) {
      attempts++;
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            { role: 'user', parts: [{ text: `${SYSTEM_TRIAGE_PROMPT}\n\n${userPrompt}` }] }
          ],
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          }
        });

        const text = response.text || '';
        const parsedJson = extractJsonFromResponse(text);
        analysis = AiAnalysisSchema.parse(parsedJson);
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini AI] Attempt ${attempts} failed: ${err.message || err}. Retrying...`);
      }
    }

    if (!analysis) {
      console.error(`[Gemini AI] Gemini generation failed after retry: ${lastError?.message || lastError}. Using safe fallback.`);
      analysis = generateMockAnalysis(issue, translateTamil);
    }
  }

  // Determine final status
  const status = (analysis.is_real_bug && analysis.confidence >= 0.7)
    ? 'pending_approval'
    : 'rejected_by_ai';

  // Persist to database if issue.id is present
  if (issue.id) {
    try {
      const pool = getPool();
      await pool.query(
        `UPDATE issues
         SET ai_analysis = $1,
             status = $2
         WHERE id = $3`,
        [JSON.stringify(analysis), status, issue.id]
      );

      // If status is pending_approval, also create or update corresponding record in reports table
      if (status === 'pending_approval') {
        await pool.query(
          `INSERT INTO reports (issue_id, status, report_title, report_body, report_body_tamil)
           VALUES ($1, 'pending_approval', $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [issue.id, analysis.report_title, analysis.report_body, analysis.report_body_tamil || null]
        );
      }
    } catch (dbErr) {
      console.error('[Gemini AI] Failed to save AI analysis to DB:', dbErr);
    }
  }

  return { analysis, status, cached: false };
}
