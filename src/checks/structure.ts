import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CheckResult, EngineContext } from '../types/index.js';
import type { ReleaseReadinessConfig } from '../config/schema.js';

export function runStructureChecks(
  context: EngineContext,
  config: ReleaseReadinessConfig['structure'],
): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. README Check
  if (config.checkReadme) {
    const readmeCandidates = [
      'README.md',
      'README',
      'readme.md',
      'README.markdown',
      'readme.markdown',
    ];
    const foundReadme = readmeCandidates.find((c) => context.hasFile(c));
    if (foundReadme) {
      results.push({
        id: 'STRUC-README',
        category: 'structure',
        name: 'README File Presence',
        status: 'pass',
        severity: 'info',
        filePath: foundReadme,
        message: `README file found at "${foundReadme}".`,
      });
    } else {
      results.push({
        id: 'STRUC-README',
        category: 'structure',
        name: 'README File Presence',
        status: 'fail',
        severity: 'error',
        filePath: 'README.md',
        message:
          'No README file found. A project README is required to guide users and contributors.',
        remediation:
          'Create a README.md file in the repository root explaining the project purpose, setup, and usage.',
      });
    }
  }

  // 2. License Check
  if (config.checkLicense) {
    const licenseCandidates = [
      'LICENSE',
      'LICENSE.md',
      'LICENSE.txt',
      'LICENCE',
      'LICENCE.md',
      'COPYING',
      'COPYING.txt',
    ];
    const foundLicense = licenseCandidates.find((c) => context.hasFile(c));
    if (foundLicense) {
      results.push({
        id: 'STRUC-LICENSE',
        category: 'structure',
        name: 'License File Presence',
        status: 'pass',
        severity: 'info',
        filePath: foundLicense,
        message: `License file found at "${foundLicense}".`,
      });
    } else {
      results.push({
        id: 'STRUC-LICENSE',
        category: 'structure',
        name: 'License File Presence',
        status: 'fail',
        severity: 'error',
        filePath: 'LICENSE',
        message: 'No open-source LICENSE file found in repository root.',
        remediation:
          'Add a standard open-source LICENSE file (e.g., MIT, Apache-2.0, BSD-3-Clause) to the repository root.',
      });
    }
  }

  // 3. Changelog Check
  if (config.checkChangelog) {
    const changelogCandidates = [
      'CHANGELOG.md',
      'CHANGELOG',
      'changelog.md',
      'HISTORY.md',
      'RELEASES.md',
    ];
    const foundChangelog = changelogCandidates.find((c) => context.hasFile(c));
    if (foundChangelog) {
      results.push({
        id: 'STRUC-CHANGELOG',
        category: 'structure',
        name: 'Changelog Presence',
        status: 'pass',
        severity: 'info',
        filePath: foundChangelog,
        message: `Changelog found at "${foundChangelog}".`,
      });
    } else {
      results.push({
        id: 'STRUC-CHANGELOG',
        category: 'structure',
        name: 'Changelog Presence',
        status: 'fail',
        severity: 'error',
        filePath: 'CHANGELOG.md',
        message:
          'No CHANGELOG.md or HISTORY.md found. Release readiness requires documented version changes.',
        remediation:
          'Create a CHANGELOG.md file documenting version releases and changes following Keep a Changelog conventions.',
      });
    }
  }

  // 4. Security Policy Check
  if (config.checkSecurityPolicy) {
    const securityCandidates = [
      'SECURITY.md',
      '.github/SECURITY.md',
      'docs/SECURITY.md',
      'security.md',
    ];
    const foundSec = securityCandidates.find((c) => context.hasFile(c));
    if (foundSec) {
      results.push({
        id: 'STRUC-SECURITY',
        category: 'structure',
        name: 'Security Policy Presence',
        status: 'pass',
        severity: 'info',
        filePath: foundSec,
        message: `Security policy found at "${foundSec}".`,
      });
    } else {
      results.push({
        id: 'STRUC-SECURITY',
        category: 'structure',
        name: 'Security Policy Presence',
        status: 'fail',
        severity: 'warning',
        filePath: 'SECURITY.md',
        message:
          'No SECURITY.md file found. A security policy is recommended for responsible disclosure.',
        remediation:
          'Add a SECURITY.md file outlining vulnerability reporting procedures and response expectations.',
      });
    }
  }

  // 5. Contributing Guidelines Check
  if (config.checkContributing) {
    const contribCandidates = [
      'CONTRIBUTING.md',
      '.github/CONTRIBUTING.md',
      'docs/CONTRIBUTING.md',
      'contributing.md',
    ];
    const foundContrib = contribCandidates.find((c) => context.hasFile(c));
    if (foundContrib) {
      results.push({
        id: 'STRUC-CONTRIB',
        category: 'structure',
        name: 'Contribution Guidelines Presence',
        status: 'pass',
        severity: 'info',
        filePath: foundContrib,
        message: `Contribution guidelines found at "${foundContrib}".`,
      });
    } else {
      results.push({
        id: 'STRUC-CONTRIB',
        category: 'structure',
        name: 'Contribution Guidelines Presence',
        status: 'fail',
        severity: 'warning',
        filePath: 'CONTRIBUTING.md',
        message: 'No CONTRIBUTING.md guidelines found.',
        remediation:
          'Add CONTRIBUTING.md outlining branch strategies, PR expectations, and development workflow.',
      });
    }
  }

  // 6. Codeowners Check
  if (config.checkCodeowners) {
    const codeownerCandidates = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS'];
    const foundCodeowners = codeownerCandidates.find((c) => context.hasFile(c));
    if (foundCodeowners) {
      results.push({
        id: 'STRUC-CODEOWNERS',
        category: 'structure',
        name: 'Code Ownership Configuration',
        status: 'pass',
        severity: 'info',
        filePath: foundCodeowners,
        message: `Codeowners file found at "${foundCodeowners}".`,
      });
    } else {
      results.push({
        id: 'STRUC-CODEOWNERS',
        category: 'structure',
        name: 'Code Ownership Configuration',
        status: 'fail',
        severity: 'warning',
        filePath: '.github/CODEOWNERS',
        message: 'No CODEOWNERS file configured.',
        remediation:
          'Create a .github/CODEOWNERS file defining responsible teams or reviewers for repository paths.',
      });
    }
  }

  // 7. CI Workflows Check
  if (config.checkCiWorkflow) {
    const hasWorkflows = context.files.some(
      (f) =>
        f.relativePath.startsWith('.github/workflows/') &&
        (f.extension === '.yml' || f.extension === '.yaml'),
    );
    if (hasWorkflows) {
      results.push({
        id: 'STRUC-CI',
        category: 'structure',
        name: 'CI Workflow Configuration',
        status: 'pass',
        severity: 'info',
        message: 'GitHub Actions workflow configurations detected in .github/workflows/.',
      });
    } else {
      results.push({
        id: 'STRUC-CI',
        category: 'structure',
        name: 'CI Workflow Configuration',
        status: 'fail',
        severity: 'warning',
        filePath: '.github/workflows',
        message:
          'No CI workflow files found in .github/workflows/. Automated testing and validation workflows should be defined.',
        remediation:
          'Add a GitHub Actions workflow in .github/workflows/ to test, lint, and build your project on push and PR.',
      });
    }
  }

  // 8. Custom Required Files
  for (const reqFile of config.requiredFiles) {
    if (context.hasFile(reqFile)) {
      results.push({
        id: `STRUC-REQ-FILE-${reqFile.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'structure',
        name: `Required File: ${reqFile}`,
        status: 'pass',
        severity: 'info',
        filePath: reqFile,
        message: `Configured required file "${reqFile}" exists.`,
      });
    } else {
      results.push({
        id: `STRUC-REQ-FILE-${reqFile.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'structure',
        name: `Required File: ${reqFile}`,
        status: 'fail',
        severity: 'error',
        filePath: reqFile,
        message: `Required file "${reqFile}" is missing.`,
        remediation: `Ensure "${reqFile}" is committed and present in the repository before release.`,
      });
    }
  }

  // 9. Custom Required Directories
  for (const reqDir of config.requiredDirectories) {
    const dirAbs = resolve(context.workingDirectory, reqDir);
    const exists = existsSync(dirAbs) && statSync(dirAbs).isDirectory();
    if (exists) {
      results.push({
        id: `STRUC-REQ-DIR-${reqDir.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'structure',
        name: `Required Directory: ${reqDir}`,
        status: 'pass',
        severity: 'info',
        filePath: reqDir,
        message: `Configured required directory "${reqDir}" exists.`,
      });
    } else {
      results.push({
        id: `STRUC-REQ-DIR-${reqDir.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'structure',
        name: `Required Directory: ${reqDir}`,
        status: 'fail',
        severity: 'error',
        filePath: reqDir,
        message: `Required directory "${reqDir}" is missing.`,
        remediation: `Ensure directory "${reqDir}" exists in the repository before release.`,
      });
    }
  }

  return results;
}
