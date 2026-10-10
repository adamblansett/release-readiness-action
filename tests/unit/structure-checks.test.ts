import { describe, it, expect } from 'vitest';
import { runStructureChecks } from '../../src/checks/structure.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';
import type { EngineContext, CollectedFile } from '../../src/types/index.js';

function createMockContext(files: Record<string, string>): EngineContext {
  const collected: CollectedFile[] = Object.keys(files).map((path) => ({
    relativePath: path,
    absolutePath: `/mock/${path}`,
    sizeBytes: Buffer.byteLength(files[path] || '', 'utf-8'),
    extension: path.includes('.') ? `.${path.split('.').pop()}` : '',
  }));

  return {
    workingDirectory: '/mock',
    files: collected,
    hasFile: (p) => Boolean(files[p]),
    readFile: (p) => files[p] ?? null,
    readJson: <T>(p: string) => {
      try {
        return files[p] ? (JSON.parse(files[p]!) as T) : null;
      } catch {
        return null;
      }
    },
    getFileSize: (p) => (files[p] ? Buffer.byteLength(files[p]!, 'utf-8') : null),
  };
}

describe('Structure Checks', () => {
  it('passes when README, License, and CI workflows exist', () => {
    const context = createMockContext({
      'README.md': '# Project\nDocumentation here.',
      LICENSE: 'MIT License\nCopyright 2026',
      '.github/workflows/ci.yml': 'name: CI\non: [push]',
    });

    const results = runStructureChecks(context, DEFAULT_CONFIG.structure);

    expect(results.find((r) => r.id === 'STRUC-README')?.status).toBe('pass');
    expect(results.find((r) => r.id === 'STRUC-LICENSE')?.status).toBe('pass');
    expect(results.find((r) => r.id === 'STRUC-CI')?.status).toBe('pass');
  });

  it('fails with actionable message when README or License is missing', () => {
    const context = createMockContext({
      '.github/workflows/ci.yml': 'name: CI',
    });

    const results = runStructureChecks(context, DEFAULT_CONFIG.structure);

    const readmeRes = results.find((r) => r.id === 'STRUC-README');
    expect(readmeRes?.status).toBe('fail');
    expect(readmeRes?.remediation).toBeDefined();

    const licenseRes = results.find((r) => r.id === 'STRUC-LICENSE');
    expect(licenseRes?.status).toBe('fail');
    expect(licenseRes?.remediation).toBeDefined();
  });

  it('evaluates optional checks like Changelog, Security policy, Contributing, and Codeowners when enabled', () => {
    const context = createMockContext({
      'README.md': '# Title',
      LICENSE: 'MIT',
      'CHANGELOG.md': '# Changelog',
      'SECURITY.md': '# Security',
      'CONTRIBUTING.md': '# Contributing',
      CODEOWNERS: '* @admin',
      '.github/workflows/ci.yml': 'name: CI',
    });

    const results = runStructureChecks(context, {
      ...DEFAULT_CONFIG.structure,
      checkChangelog: true,
      checkSecurityPolicy: true,
      checkContributing: true,
      checkCodeowners: true,
    });

    expect(results.find((r) => r.id === 'STRUC-CHANGELOG')?.status).toBe('pass');
    expect(results.find((r) => r.id === 'STRUC-SECURITY')?.status).toBe('pass');
    expect(results.find((r) => r.id === 'STRUC-CONTRIB')?.status).toBe('pass');
    expect(results.find((r) => r.id === 'STRUC-CODEOWNERS')?.status).toBe('pass');
  });

  it('validates user-specified required files', () => {
    const context = createMockContext({
      'README.md': 'content',
      LICENSE: 'content',
      '.github/workflows/ci.yml': 'content',
      'docs/architecture.md': 'Architecture design',
    });

    const results = runStructureChecks(context, {
      ...DEFAULT_CONFIG.structure,
      requiredFiles: ['docs/architecture.md', 'docs/deployment.md'],
    });

    const archRes = results.find((r) => r.id === 'STRUC-REQ-FILE-docs_architecture_md');
    expect(archRes?.status).toBe('pass');

    const depRes = results.find((r) => r.id === 'STRUC-REQ-FILE-docs_deployment_md');
    expect(depRes?.status).toBe('fail');
  });
});
