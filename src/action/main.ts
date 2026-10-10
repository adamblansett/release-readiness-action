import * as core from '@actions/core';
import { parseActionInputs } from './inputs.js';
import { loadConfig } from '../config/loader.js';
import { ReleaseReadinessEngine } from '../core/engine.js';
import { formatTerminalReport } from '../reporters/terminal-reporter.js';
import { formatMarkdownReport } from '../reporters/markdown-reporter.js';
import { formatJsonReport } from '../reporters/json-reporter.js';
import { writeGitHubSummaryAndAnnotations } from '../reporters/github-summary.js';

export async function runAction(): Promise<void> {
  try {
    core.info('Starting Release Readiness evaluation...');

    // 1. Parse inputs
    const inputs = parseActionInputs();

    // 2. Load and validate configuration
    const { config, configFilePath, source } = loadConfig({
      cwd: inputs.workingDirectory,
      configPath: inputs.configPath,
      overrides: inputs.overrides,
    });

    if (source === 'file') {
      core.info(`Loaded configuration from "${configFilePath}".`);
    } else {
      core.info('No configuration file found; using default release-readiness rules.');
    }

    // 3. Run evaluation engine
    const engine = new ReleaseReadinessEngine(config);
    const report = await engine.evaluate();

    // 4. Output terminal report for workflow logs
    const terminalOutput = formatTerminalReport(report);
    console.log(terminalOutput);

    // 5. Output GitHub Step Summary and PR annotations
    await writeGitHubSummaryAndAnnotations(report, {
      createSummary: inputs.createSummary,
      annotateGitHub: inputs.annotateGitHub,
    });

    // 6. Set Action Outputs
    const markdownReport = formatMarkdownReport(report);
    const jsonReport = formatJsonReport(report);
    const totalFindings = report.summary.errors + report.summary.warnings;

    core.setOutput('passed', String(report.passed));
    core.setOutput('findings-count', String(totalFindings));
    core.setOutput('errors-count', String(report.summary.errors));
    core.setOutput('warnings-count', String(report.summary.warnings));
    core.setOutput('report-json', jsonReport);
    core.setOutput('report-markdown', markdownReport);

    // 7. Fail action if readiness requirements not met
    if (!report.passed) {
      core.setFailed(
        `Release readiness evaluation failed with ${report.summary.errors} error(s) and ${report.summary.warnings} warning(s). Check the step summary for details and remediation steps.`,
      );
    } else {
      core.info('✓ All release readiness requirements passed successfully.');
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    core.setFailed(`Release Readiness Action encountered a critical error: ${msg}`);
  }
}

// Automatically invoke if running as entry script
runAction();
