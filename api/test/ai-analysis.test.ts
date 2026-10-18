import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AiAnalysisSchema, extractJsonFromResponse, generateMockAnalysis, analyzeIssue } from '../src/ai/analyzer.js';

describe('Phase 4: Gemini AI Analysis and Schema Validation', () => {
  it('extracts JSON cleanly from markdown code blocks', () => {
    const raw = '```json\n{\n  "test": 123\n}\n```';
    const parsed = extractJsonFromResponse(raw);
    assert.strictEqual(parsed.test, 123);
  });

  it('validates a correct AI analysis structure against Zod schema', () => {
    const valid = {
      is_real_bug: true,
      confidence: 0.95,
      category: 'accessibility' as const,
      severity: 'medium' as const,
      summary: 'Image missing alt text attribute',
      plain_english_explanation: 'Screen readers cannot describe this image to visually impaired visitors.',
      suggested_fix: 'Add an informative alt="Site Logo" attribute to the <img> tag.',
      affected_users: 'Visually impaired users relying on screen readers',
      report_title: 'WCAG Violation: Missing Image Alternative Text',
      report_body: '## Overview\nThe image at /assets/logo.png lacks alternative text.',
      report_body_tamil: '## சுருக்கம்\nபடத்திற்கு மாற்று உரை இல்லை.',
    };

    const parsed = AiAnalysisSchema.parse(valid);
    assert.strictEqual(parsed.is_real_bug, true);
    assert.strictEqual(parsed.confidence, 0.95);
    assert.ok(parsed.report_body_tamil);
  });

  it('rejects invalid structures missing required fields', () => {
    const invalid = {
      is_real_bug: true,
      // missing confidence, summary, etc.
    };

    assert.throws(() => {
      AiAnalysisSchema.parse(invalid);
    });
  });

  it('correctly assigns status to pending_approval when real bug and confidence >= 0.7', async () => {
    const issue = {
      type: 'broken_link',
      severity: 'high',
      title: 'Broken link 404',
      description: 'Anchor points to nonexistent endpoint',
      url: 'http://localhost:4000/',
      evidence: { selector: '#broken-link' },
      stepsToReproduce: ['Click link'],
    };

    const res = await analyzeIssue(issue, { forceMock: true });
    assert.strictEqual(res.analysis.is_real_bug, true);
    assert.ok(res.analysis.confidence >= 0.7);
    assert.strictEqual(res.status, 'pending_approval');
  });

  it('correctly assigns status to rejected_by_ai for false positives like cookie banner or login wall', async () => {
    const issue = {
      type: 'cookie_consent_wall',
      severity: 'low',
      title: 'Cookie banner encountered',
      description: 'GDPR consent overlay displayed',
      url: 'http://localhost:4000/',
      evidence: {},
      stepsToReproduce: ['Visit site'],
    };

    const res = await analyzeIssue(issue, { forceMock: true });
    assert.strictEqual(res.analysis.is_real_bug, false);
    assert.strictEqual(res.status, 'rejected_by_ai');
  });

  it('uses cached analysis when available on the issue object', async () => {
    const cachedAnalysis = generateMockAnalysis({
      type: 'console_error',
      severity: 'high',
      title: 'Cached Console Error',
      description: 'Uncaught TypeError',
      url: 'http://localhost:4000/',
    });

    const issue = {
      type: 'console_error',
      severity: 'high',
      title: 'Cached Console Error',
      description: 'Uncaught TypeError',
      url: 'http://localhost:4000/',
      evidence: {},
      stepsToReproduce: [],
      ai_analysis: cachedAnalysis,
    };

    const res = await analyzeIssue(issue);
    assert.strictEqual(res.cached, true);
    assert.strictEqual(res.status, 'pending_approval');
  });
});
