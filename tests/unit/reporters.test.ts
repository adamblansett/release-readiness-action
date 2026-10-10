import { describe, it, expect } from 'vitest';
import { formatMarkdownReport } from '../../src/reporters/markdown-reporter.js';
import { formatJsonReport } from '../../src/reporters/json-reporter.js';
import { formatTerminalReport } from '../../src/reporters/terminal-reporter.js';
import type { ReadinessReport } from '../../src/types/index.js';

const mockReport: ReadinessReport = {
  timestamp: '2026-10-10T12:00:00.000Z',
  workingDirectory: '/mock',
  passed: false,
  failThreshold: 'error',
  summary: {
    totalChecks: 10,
    passed: 8,
    warnings: 1,
    errors: 1,
    skipped: 0,
    durationMs: 120,
  },
  categories: {
    structure: { total: 2, passed: 2, warnings: 0, errors: 0, skipped: 0 },
    documentation: { total: 2, passed: 1, warnings: 1, errors: 0, skipped: 0 },
    package: { total: 2, passed: 1, warnings: 0, errors: 1, skipped: 0 },
    scripts: { total: 1, passed: 1, warnings: 0, errors: 0, skipped: 0 },
    secrets: { total: 1, passed: 1, warnings: 0, errors: 0, skipped: 0 },
    dependencies: { total: 1, passed: 1, warnings: 0, errors: 0, skipped: 0 },
    git: { total: 1, passed: 1, warnings: 0, errors: 0, skipped: 0 },
    checklist: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
    custom: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
  },
  results: [
    {
      id: 'PKG-ENTRY-MISSING',
      category: 'package',
      name: 'Declared Entry Point Exists',
      status: 'fail',
      severity: 'error',
      filePath: 'package.json',
      message: 'Entry point dist/index.js does not exist.',
      remediation: 'Build the package before evaluating readiness.',
    },
    {
      id: 'DOC-PLACEHOLDER',
      category: 'documentation',
      name: 'Unresolved Placeholder',
      status: 'warn',
      severity: 'warning',
      filePath: 'README.md',
      line: 5,
      message: 'Found TODO placeholder.',
      remediation: 'Replace TODO with actual documentation.',
    },
  ],
};

describe('Reporters', () => {
  describe('Markdown Reporter', () => {
    it('produces valid GFM report with summary tables and actionable findings', () => {
      const md = formatMarkdownReport(mockReport);

      expect(md).toContain('# ❌ Release Readiness Evaluation: FAILED');
      expect(md).toContain('| **Total Checks** | 10 |');
      expect(md).toContain('| **Errors** ❌ | 1 |');
      expect(md).toContain('### ⚠️ Actionable Findings');
      expect(md).toContain('`package.json`');
      expect(md).toContain('Entry point dist/index.js does not exist.');
      expect(md).toContain('💡 Build the package before evaluating readiness.');
    });
  });

  describe('JSON Reporter', () => {
    it('serializes report to parseable JSON string matching schema', () => {
      const json = formatJsonReport(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.passed).toBe(false);
      expect(parsed.summary.totalChecks).toBe(10);
      expect(parsed.results).toHaveLength(2);
    });
  });

  describe('Terminal Reporter', () => {
    it('formats readable console output with section titles and summary counts', () => {
      const term = formatTerminalReport(mockReport);

      expect(term).toContain('RELEASE READINESS EVALUATION:');
      expect(term).toContain('FAILED');
      expect(term).toContain('Total: 10');
      expect(term).toContain('Errors: 1');
      expect(term).toContain('Remediation: Build the package before evaluating readiness.');
    });
  });
});
