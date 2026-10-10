import { Command } from 'commander';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pc from 'picocolors';
import { loadConfig } from '../config/loader.js';
import { ReleaseReadinessEngine } from '../core/engine.js';
import { formatTerminalReport } from '../reporters/terminal-reporter.js';
import { formatMarkdownReport } from '../reporters/markdown-reporter.js';
import { formatJsonReport } from '../reporters/json-reporter.js';

const STARTER_CONFIG_YAML = `# Release Readiness Action Configuration
# https://github.com/adamblansett/release-readiness-action

failOn: error
failOnSecrets: true

structure:
  checkReadme: true
  checkLicense: true
  checkChangelog: false
  checkSecurityPolicy: false
  checkContributing: false
  checkCodeowners: false
  checkCiWorkflow: true
  requiredFiles: []
  requiredDirectories: []

documentation:
  minFileSizeBytes: 20
  disallowPlaceholders: true

packageMetadata:
  enabled: true
  requireName: true
  requireVersion: true
  validateSemver: true
  validateEntryPoints: true
  validateFilesWhitelist: true

scripts:
  execute: false
  requiredScripts:
    - test
    - build

secrets:
  enabled: true
  maxFileSizeKb: 512

dependencies:
  checkLockfile: true
  checkMultipleLockfiles: true
  audit: false

git:
  checkUncommitted: false
`;

export async function runCli(): Promise<void> {
  const program = new Command();

  program
    .name('release-readiness')
    .description('Evaluate software release-readiness before release or deployment')
    .version('1.0.0')
    .option('-c, --config <path>', 'Path to configuration file (.release-readiness.yml or .json)')
    .option('-d, --cwd <path>', 'Working directory to evaluate', '.')
    .option('--fail-on <level>', 'Fail threshold: error, warning, or never', 'error')
    .option('--execute-scripts', 'Execute configured scripts (safe opt-in)', false)
    .option('--check-uncommitted', 'Fail if git working tree has uncommitted changes', false)
    .option('--no-secrets', 'Disable secret scanning')
    .option('--json', 'Output report as JSON')
    .option('--markdown', 'Output report as Markdown')
    .option('--init', 'Generate a starter .release-readiness.yml config file');

  program.parse(process.argv);
  const opts = program.opts();

  if (opts.init) {
    const targetPath = resolve(opts.cwd, '.release-readiness.yml');
    if (existsSync(targetPath)) {
      console.error(pc.yellow(`Configuration file already exists at: ${targetPath}`));
      process.exit(1);
    }
    writeFileSync(targetPath, STARTER_CONFIG_YAML, 'utf-8');
    console.log(pc.green(`✓ Created starter configuration at: ${targetPath}`));
    process.exit(0);
  }

  try {
    const overrides: Partial<import('../config/schema.js').RawReleaseReadinessConfig> = {
      workingDirectory: opts.cwd,
      failOn: opts.failOn,
    };

    if (opts.executeScripts) {
      overrides.scripts = { execute: true };
    }
    if (opts.secrets === false) {
      overrides.secrets = { enabled: false };
    }
    if (opts.checkUncommitted) {
      overrides.git = { checkUncommitted: true };
    }

    const { config, configFilePath } = loadConfig({
      cwd: opts.cwd,
      configPath: opts.config,
      overrides,
    });

    if (configFilePath && !opts.json && !opts.markdown) {
      console.log(pc.dim(`Using configuration from: ${configFilePath}`));
    }

    const engine = new ReleaseReadinessEngine(config);
    const report = await engine.evaluate();

    if (opts.json) {
      console.log(formatJsonReport(report));
    } else if (opts.markdown) {
      console.log(formatMarkdownReport(report));
    } else {
      console.log(formatTerminalReport(report));
    }

    if (!report.passed) {
      process.exit(1);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`Error: ${msg}`));
    process.exit(2);
  }
}

// Only invoke automatically when run as main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
