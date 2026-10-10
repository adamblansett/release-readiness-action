import * as core from '@actions/core';
import type { ReadinessReport } from '../types/index.js';
import { formatMarkdownReport } from './markdown-reporter.js';

export async function writeGitHubSummaryAndAnnotations(
  report: ReadinessReport,
  options: { createSummary?: boolean; annotateGitHub?: boolean } = {},
): Promise<void> {
  const { createSummary = true, annotateGitHub = true } = options;

  // 1. Output GitHub Step Summary
  if (createSummary) {
    const markdown = formatMarkdownReport(report);
    try {
      await core.summary.addRaw(markdown).write();
    } catch {
      // If running outside GitHub Actions environment or summary write fails, proceed gracefully
    }
  }

  // 2. Output GitHub Annotations for actionable findings
  if (annotateGitHub) {
    for (const finding of report.results) {
      if (finding.status === 'fail' || finding.status === 'warn') {
        const annotationProperties: core.AnnotationProperties = {
          title: `[${finding.id}] ${finding.name}`,
          file: finding.filePath || undefined,
          startLine: finding.line || undefined,
          startColumn: finding.column || undefined,
        };

        const messageText = finding.remediation
          ? `${finding.message}\nRemediation: ${finding.remediation}`
          : finding.message;

        if (finding.severity === 'error' || finding.status === 'fail') {
          core.error(messageText, annotationProperties);
        } else {
          core.warning(messageText, annotationProperties);
        }
      }
    }
  }
}
