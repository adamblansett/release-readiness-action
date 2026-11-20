import * as core from '@actions/core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseActionInputs } from './inputs.js';
import { loadConfig } from '../config/loader.js';
import { ReleaseReadinessEngine } from '../core/engine.js';
import { formatTerminalReport } from '../reporters/terminal-reporter.js';
import { formatMarkdownReport } from '../reporters/markdown-reporter.js';
import { formatJsonReport } from '../reporters/json-reporter.js';
import { writeGitHubSummaryAndAnnotations } from '../reporters/github-summary.js';
import { isPathInside } from '../utils/path-utils.js';

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

    const markdownReport = formatMarkdownReport(report);
    const jsonReport = formatJsonReport(report);

    // 4. Output report according to configured reporting format
    const outputFormat = config.reporting.format;
    if (outputFormat === 'all' || outputFormat === 'console') {
      console.log(formatTerminalReport(report));
    } else if (outputFormat === 'json') {
      console.log(jsonReport);
    } else if (outputFormat === 'markdown') {
      console.log(markdownReport);
    } else if (outputFormat === 'summary') {
      core.info(
        `Release Readiness: ${report.passed ? 'PASSED' : 'FAILED'} (${report.summary.passed} passed, ${report.summary.warnings} warning(s), ${report.summary.errors} error(s), ${report.summary.skipped} skipped)`,
      );
    }

    // 5. Write optional report files safely within workingDirectory
    if (config.reporting.summaryFile) {
      const summaryPath = resolve(config.workingDirectory, config.reporting.summaryFile);
      if (!isPathInside(config.workingDirectory, summaryPath)) {
        throw new Error(
          `Configured reporting.summaryFile "${config.reporting.summaryFile}" resolves outside the working directory.`,
        );
      }
      mkdirSync(dirname(summaryPath), { recursive: true });
      writeFileSync(summaryPath, markdownReport, 'utf-8');
    }

    if (config.reporting.jsonOutputFile) {
      const jsonPath = resolve(config.workingDirectory, config.reporting.jsonOutputFile);
      if (!isPathInside(config.workingDirectory, jsonPath)) {
        throw new Error(
          `Configured reporting.jsonOutputFile "${config.reporting.jsonOutputFile}" resolves outside the working directory.`,
        );
      }
      mkdirSync(dirname(jsonPath), { recursive: true });
      writeFileSync(jsonPath, jsonReport, 'utf-8');
    }

    // 6. Output GitHub Step Summary and PR annotations
    await writeGitHubSummaryAndAnnotations(report, {
      createSummary: config.reporting.createSummary,
      annotateGitHub: config.reporting.annotateGitHub,
    });

    // 7. Set Action Outputs
    const totalFindings = report.summary.errors + report.summary.warnings;

    core.setOutput('passed', String(report.passed));
    core.setOutput('findings-count', String(totalFindings));
    core.setOutput('errors-count', String(report.summary.errors));
    core.setOutput('warnings-count', String(report.summary.warnings));
    core.setOutput('report-json', jsonReport);
    core.setOutput('report-markdown', markdownReport);

    // 8. Fail action if readiness requirements not met
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
