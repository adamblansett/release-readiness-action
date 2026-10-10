import pc from 'picocolors';
import type { ReadinessReport, Category } from '../types/index.js';

const STATUS_ICONS: Record<string, string> = {
  pass: pc.green('✓ PASS'),
  fail: pc.red('✗ FAIL'),
  warn: pc.yellow('⚠ WARN'),
  skip: pc.gray('○ SKIP'),
};

export function formatTerminalReport(report: ReadinessReport): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(
    pc.bold(pc.cyan('======================================================================')),
  );
  lines.push(
    pc.bold(
      `  RELEASE READINESS EVALUATION: ${report.passed ? pc.green('PASSED') : pc.red('FAILED')}`,
    ),
  );
  lines.push(
    pc.bold(pc.cyan('======================================================================')),
  );
  lines.push('');

  // Summary counts
  lines.push(
    `  Total: ${pc.bold(report.summary.totalChecks)} | ` +
      `Passed: ${pc.green(report.summary.passed)} | ` +
      `Warnings: ${pc.yellow(report.summary.warnings)} | ` +
      `Errors: ${pc.red(report.summary.errors)} | ` +
      `Skipped: ${pc.gray(report.summary.skipped)} | ` +
      `Duration: ${report.summary.durationMs}ms`,
  );
  lines.push('');

  // Group by category
  const categoriesPresent = Array.from(
    new Set(report.results.map((r) => r.category)),
  ) as Category[];

  for (const cat of categoriesPresent) {
    const catResults = report.results.filter((r) => r.category === cat);
    lines.push(pc.bold(pc.underline(`[${cat.toUpperCase()}]`)));

    for (const res of catResults) {
      const badge = STATUS_ICONS[res.status] || res.status;
      const filePart = res.filePath
        ? pc.dim(` (${res.filePath}${res.line ? `:${res.line}` : ''})`)
        : '';
      lines.push(`  ${badge} ${pc.bold(res.name)}${filePart}`);

      if (res.status === 'fail' || res.status === 'warn') {
        lines.push(`         ${pc.dim(res.message)}`);
        if (res.remediation) {
          lines.push(`         ${pc.cyan('Remediation:')} ${res.remediation}`);
        }
      }
    }
    lines.push('');
  }

  lines.push(
    pc.bold(pc.cyan('----------------------------------------------------------------------')),
  );
  if (report.passed) {
    lines.push(pc.green(pc.bold('  ✓ All release-readiness requirements satisfied!')));
  } else {
    lines.push(
      pc.red(pc.bold(`  ✗ Release blocked: ${report.summary.errors} error(s) must be resolved.`)),
    );
  }
  lines.push(
    pc.bold(pc.cyan('----------------------------------------------------------------------')),
  );
  lines.push('');

  return lines.join('\n');
}
