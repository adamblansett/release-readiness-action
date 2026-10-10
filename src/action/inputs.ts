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

function parseBooleanInput(name: string, defaultValue?: boolean): boolean | undefined {
  const val = core.getInput(name).trim();
  if (!val) return defaultValue;
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
  const failOn =
    failOnRaw === 'error' || failOnRaw === 'warning' || failOnRaw === 'never'
      ? failOnRaw
      : undefined;

  const failOnSecrets = parseBooleanInput('fail-on-secrets');
  const executeScripts = parseBooleanInput('execute-scripts');
  const checkSecrets = parseBooleanInput('check-secrets');
  const checkUncommitted = parseBooleanInput('check-uncommitted');
  const checkTagVersion = parseBooleanInput('check-tag-version');
  const auditDependencies = parseBooleanInput('audit-dependencies');
  const createSummary = parseBooleanInput('create-summary', true) ?? true;
  const annotateGitHub = parseBooleanInput('annotate-github', true) ?? true;

  const rawFormat = parseStringInput('output-format')?.toLowerCase();
  const outputFormat =
    rawFormat === 'summary' ||
    rawFormat === 'markdown' ||
    rawFormat === 'json' ||
    rawFormat === 'console'
      ? rawFormat
      : 'all';

  const scriptsToRun = parseStringInput('scripts-to-run');

  const overrides: Partial<RawReleaseReadinessConfig> = {
    workingDirectory,
  };

  if (failOn) overrides.failOn = failOn;
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

  if (executeScripts !== undefined || scriptsToRun) {
    const commands = scriptsToRun
      ? scriptsToRun
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .map((s) => ({
            name: `npm run ${s}`,
            command: 'npm',
            args: ['run', s],
          }))
      : [];

    overrides.scripts = {
      execute: executeScripts ?? false,
      commands,
    };
  }

  overrides.reporting = {
    format: outputFormat,
    createSummary,
    annotateGitHub,
  };

  return {
    configPath,
    workingDirectory,
    overrides,
    outputFormat,
    createSummary,
    annotateGitHub,
  };
}
