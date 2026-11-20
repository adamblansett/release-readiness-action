import { describe, it, expect, vi } from 'vitest';
import * as core from '@actions/core';
import { writeGitHubSummaryAndAnnotations } from '../../src/reporters/github-summary.js';
import type { ReadinessReport } from '../../src/types/index.js';

describe('GitHub Summary and Annotations', () => {
  it('calls core.summary and core.error/warning with correct annotation properties', async () => {
    const errorSpy = vi.spyOn(core, 'error').mockImplementation(() => {});
    const warningSpy = vi.spyOn(core, 'warning').mockImplementation(() => {});
    const addRawSpy = vi.spyOn(core.summary, 'addRaw').mockReturnThis();
    const writeSpy = vi.spyOn(core.summary, 'write').mockResolvedValue(core.summary);

    const report: ReadinessReport = {
      timestamp: '2026-10-10T00:00:00Z',
      workingDirectory: '.',
      passed: false,
      failThreshold: 'error',
      summary: {
        totalChecks: 2,
        passed: 0,
        warnings: 1,
        errors: 1,
        skipped: 0,
        durationMs: 50,
      },
      categories: {
        structure: { total: 1, passed: 0, warnings: 0, errors: 1, skipped: 0 },
        documentation: { total: 1, passed: 0, warnings: 1, errors: 0, skipped: 0 },
        package: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        scripts: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        secrets: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        dependencies: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        git: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        checklist: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        custom: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
      },
      results: [
        {
          id: 'STRUC-01',
          category: 'structure',
          name: 'Missing File',
          status: 'fail',
          severity: 'error',
          filePath: 'LICENSE',
          message: 'License missing.',
          remediation: 'Add LICENSE.',
        },
        {
          id: 'DOC-01',
          category: 'documentation',
          name: 'Warning Doc',
          status: 'warn',
          severity: 'warning',
          filePath: 'README.md',
          line: 12,
          column: 5,
          message: 'Todo found.',
        },
      ],
    };

    await writeGitHubSummaryAndAnnotations(report, {
      createSummary: true,
      annotateGitHub: true,
    });

    expect(addRawSpy).toHaveBeenCalled();
    expect(writeSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('License missing.'),
      expect.objectContaining({ title: '[STRUC-01] Missing File', file: 'LICENSE' }),
    );
    expect(warningSpy).toHaveBeenCalledWith(
      'Todo found.',
      expect.objectContaining({
        title: '[DOC-01] Warning Doc',
        file: 'README.md',
        startLine: 12,
        startColumn: 5,
      }),
    );

    errorSpy.mockRestore();
    warningSpy.mockRestore();
    addRawSpy.mockRestore();
    writeSpy.mockRestore();
  });

  it('emits warning annotations (not error) for failed checks with warning severity', async () => {
    const errorSpy = vi.spyOn(core, 'error').mockImplementation(() => {});
    const warningSpy = vi.spyOn(core, 'warning').mockImplementation(() => {});

    const report: ReadinessReport = {
      timestamp: '2026-11-19T00:00:00Z',
      workingDirectory: '.',
      passed: true,
      failThreshold: 'error',
      summary: {
        totalChecks: 1,
        passed: 0,
        warnings: 1,
        errors: 0,
        skipped: 0,
        durationMs: 10,
      },
      categories: {
        structure: { total: 1, passed: 0, warnings: 1, errors: 0, skipped: 0 },
        documentation: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        package: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        scripts: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        secrets: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        dependencies: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        git: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        checklist: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
        custom: { total: 0, passed: 0, warnings: 0, errors: 0, skipped: 0 },
      },
      results: [
        {
          id: 'STRUC-SECURITY',
          category: 'structure',
          name: 'Security Policy Presence',
          status: 'fail',
          severity: 'warning',
          filePath: 'SECURITY.md',
          message: 'No SECURITY.md file found.',
        },
      ],
    };

    await writeGitHubSummaryAndAnnotations(report, {
      createSummary: false,
      annotateGitHub: true,
    });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warningSpy).toHaveBeenCalledWith(
      'No SECURITY.md file found.',
      expect.objectContaining({
        title: '[STRUC-SECURITY] Security Policy Presence',
        file: 'SECURITY.md',
      }),
    );

    errorSpy.mockRestore();
    warningSpy.mockRestore();
  });
});
