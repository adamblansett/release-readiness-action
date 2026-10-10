import type { ReadinessReport, Category } from '../types/index.js';

const STATUS_EMOJIS: Record<string, string> = {
  pass: '✅',
  fail: '❌',
  warn: '⚠️',
  skip: '⏭️',
};

const CATEGORY_NAMES: Record<Category, string> = {
  structure: 'Project Structure',
  documentation: 'Documentation',
  package: 'Package Metadata',
  scripts: 'Scripts & Build',
  secrets: 'Secret Scanning',
  dependencies: 'Dependencies',
  git: 'Git & Artifacts',
  checklist: 'Release Checklist',
  custom: 'Custom Rules',
};

export function formatMarkdownReport(report: ReadinessReport): string {
  const lines: string[] = [];

  const overallStatusText = report.passed ? 'PASSED' : 'FAILED';
  const overallEmoji = report.passed ? '✅' : '❌';

  lines.push(`# ${overallEmoji} Release Readiness Evaluation: ${overallStatusText}`);
  lines.push('');
  lines.push(
    `> **Evaluated at:** \`${report.timestamp}\` | **Duration:** \`${report.summary.durationMs}ms\` | **Threshold:** \`${report.failThreshold}\``,
  );
  lines.push('');

  // Overview Table
  lines.push('### 📊 Summary Overview');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('| :--- | :---: |');
  lines.push(`| **Total Checks** | ${report.summary.totalChecks} |`);
  lines.push(`| **Passed** ✅ | ${report.summary.passed} |`);
  lines.push(`| **Warnings** ⚠️ | ${report.summary.warnings} |`);
  lines.push(`| **Errors** ❌ | ${report.summary.errors} |`);
  lines.push(`| **Skipped** ⏭️ | ${report.summary.skipped} |`);
  lines.push('');

  // Category Breakdown Table
  lines.push('### 📂 Category Breakdown');
  lines.push('');
  lines.push('| Category | Total | Passed | Warnings | Errors | Status |');
  lines.push('| :--- | :---: | :---: | :---: | :---: | :---: |');

  for (const [catKey, summary] of Object.entries(report.categories) as [
    Category,
    (typeof report.categories)[Category],
  ][]) {
    if (summary.total === 0) continue;
    let catStatus = '✅ Pass';
    if (summary.errors > 0) catStatus = '❌ Fail';
    else if (summary.warnings > 0) catStatus = '⚠️ Warn';
    else if (summary.skipped === summary.total) catStatus = '⏭️ Skip';

    const catName = CATEGORY_NAMES[catKey] || catKey;
    lines.push(
      `| ${catName} | ${summary.total} | ${summary.passed} | ${summary.warnings} | ${summary.errors} | ${catStatus} |`,
    );
  }
  lines.push('');

  // Findings & Remediation (Errors & Warnings)
  const actionableFindings = report.results.filter(
    (r) => r.status === 'fail' || r.status === 'warn',
  );

  if (actionableFindings.length > 0) {
    lines.push('### ⚠️ Actionable Findings');
    lines.push('');

    for (const finding of actionableFindings) {
      const emoji = finding.status === 'fail' ? '❌' : '⚠️';
      const fileLoc = finding.filePath
        ? `\`${finding.filePath}${finding.line ? `:${finding.line}` : ''}\``
        : 'Project Root';

      lines.push(`#### ${emoji} [${finding.id}] ${finding.name}`);
      lines.push('');
      lines.push(`- **Location:** ${fileLoc}`);
      lines.push(`- **Severity:** \`${finding.severity}\``);
      lines.push(`- **Issue:** ${finding.message}`);
      if (finding.remediation) {
        lines.push(`- **Remediation:** 💡 ${finding.remediation}`);
      }
      lines.push('');
    }
  } else {
    lines.push('### 🎉 No Blocking Issues Identified');
    lines.push('');
    lines.push('All evaluated criteria satisfied release-readiness requirements.');
    lines.push('');
  }

  // Full Details (Collapsible table)
  lines.push('<details>');
  lines.push(
    '<summary><b>🔍 View All Evaluated Checks (' + report.results.length + ')</b></summary>',
  );
  lines.push('');
  lines.push('| Check ID | Category | Name | Status | Message |');
  lines.push('| :--- | :--- | :--- | :---: | :--- |');

  for (const res of report.results) {
    const statusEmoji = STATUS_EMOJIS[res.status] || res.status;
    const catName = CATEGORY_NAMES[res.category] || res.category;
    const safeMsg = res.message.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    lines.push(`| \`${res.id}\` | ${catName} | ${res.name} | ${statusEmoji} | ${safeMsg} |`);
  }

  lines.push('');
  lines.push('</details>');
  lines.push('');

  return lines.join('\n');
}
