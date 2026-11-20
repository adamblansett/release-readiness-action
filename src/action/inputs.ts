import * as core from '@actions/core';
import type { RawReleaseReadinessConfig } from '../config/schema.js';

export interface ActionInputs {
  configPath?: string;
  workingDirectory: string;
  overrides: Partial<RawReleaseReadinessConfig>;
  outputFormat: 'all' | 'summary' | 'markdown' | 'json' | 'console';
  createSummary: boolean;
  annotateGitHub: boolean;
}

function parseBooleanInput(name: string): boolean | undefined {
  const val = core.getInput(name).trim();
  if (!val) return undefined;
  return val.toLowerCase() === 'true' || val === '1';
}

function parseStringInput(name: string): string | undefined {
  const val = core.getInput(name).trim();
  return val.length > 0 ? val : undefined;
}

export function parseActionInputs(): ActionInputs {
  const configPath = parseStringInput('config-path');
  const workingDirectory = parseStringInput('working-directory') || '.';

  const failOnRaw = parseStringInput('fail-on')?.toLowerCase();
  let failOn: 'error' | 'warning' | 'never' | undefined;
  if (failOnRaw !== undefined) {
    if (failOnRaw === 'error' || failOnRaw === 'warning' || failOnRaw === 'never') {
      failOn = failOnRaw;
    } else {
      throw new Error(
        `Invalid "fail-on" input value "${failOnRaw}". Expected one of: error, warning, never.`,
      );
    }
  }

  const failOnSecrets = parseBooleanInput('fail-on-secrets');
  const executeScripts = parseBooleanInput('execute-scripts');
  const checkSecrets = parseBooleanInput('check-secrets');
  const checkUncommitted = parseBooleanInput('check-uncommitted');
  const checkTagVersion = parseBooleanInput('check-tag-version');
  const auditDependencies = parseBooleanInput('audit-dependencies');
  const createSummaryInput = parseBooleanInput('create-summary');
  const annotateGitHubInput = parseBooleanInput('annotate-github');

  const rawFormat = parseStringInput('output-format')?.toLowerCase();
  let parsedFormat: ActionInputs['outputFormat'] | undefined;
  if (rawFormat !== undefined) {
    if (
      rawFormat === 'all' ||
      rawFormat === 'summary' ||
      rawFormat === 'markdown' ||
      rawFormat === 'json' ||
      rawFormat === 'console'
    ) {
      parsedFormat = rawFormat;
    } else {
      throw new Error(
        `Invalid "output-format" input value "${rawFormat}". Expected one of: all, summary, markdown, json, console.`,
      );
    }
  }

  const scriptsToRun = parseStringInput('scripts-to-run');

  const overrides: Partial<RawReleaseReadinessConfig> = {};

  if (failOn !== undefined) overrides.failOn = failOn;
  if (failOnSecrets !== undefined) overrides.failOnSecrets = failOnSecrets;

  if (checkSecrets !== undefined) {
    overrides.secrets = { enabled: checkSecrets };
  }

  if (checkUncommitted !== undefined) {
    overrides.git = { checkUncommitted };
  }

  if (checkTagVersion !== undefined) {
    overrides.packageMetadata = { checkTagVersionMatch: checkTagVersion };
  }

  if (auditDependencies !== undefined) {
    overrides.dependencies = { audit: auditDependencies };
  }

  const scriptOverrides: Partial<NonNullable<RawReleaseReadinessConfig['scripts']>> = {};
  if (executeScripts !== undefined) {
    scriptOverrides.execute = executeScripts;
  }
  if (scriptsToRun) {
    const commands = scriptsToRun
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => ({
        name: `npm run ${s}`,
        command: 'npm',
        args: ['run', s],
      }));
    if (commands.length > 0) {
      scriptOverrides.commands = commands;
    }
  }
  if (Object.keys(scriptOverrides).length > 0) {
    overrides.scripts = scriptOverrides;
  }

  const reportingOverrides: Partial<NonNullable<RawReleaseReadinessConfig['reporting']>> = {};
  if (parsedFormat !== undefined) {
    reportingOverrides.format = parsedFormat;
  }
  if (createSummaryInput !== undefined) {
    reportingOverrides.createSummary = createSummaryInput;
  }
  if (annotateGitHubInput !== undefined) {
    reportingOverrides.annotateGitHub = annotateGitHubInput;
  }
  if (Object.keys(reportingOverrides).length > 0) {
    overrides.reporting = reportingOverrides;
  }

  return {
    configPath,
    workingDirectory,
    overrides,
    outputFormat: parsedFormat ?? 'all',
    createSummary: createSummaryInput ?? true,
    annotateGitHub: annotateGitHubInput ?? true,
  };
}
