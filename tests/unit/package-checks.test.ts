import { describe, it, expect } from 'vitest';
import { runPackageChecks } from '../../src/checks/package.js';
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
    readJson: <T>(p) => {
      try {
        return files[p] ? (JSON.parse(files[p]!) as T) : null;
      } catch {
        return null;
      }
    },
    getFileSize: (p) => (files[p] ? Buffer.byteLength(files[p]!, 'utf-8') : null),
  };
}

describe('Package Checks', () => {
  it('passes when package.json contains valid metadata and existing entry points', async () => {
    const context = createMockContext({
      'package.json': JSON.stringify({
        name: 'my-awesome-tool',
        version: '1.2.3',
        description: 'A great utility',
        license: 'MIT',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        files: ['dist', 'README.md'],
      }),
      'dist/index.js': 'console.log("ready");',
      'dist/index.d.ts': 'export declare const ready: boolean;',
    });

    const results = await runPackageChecks(context, DEFAULT_CONFIG.packageMetadata);

    expect(results.find((r) => r.id === 'PKG-NAME-VALID')?.status).toBe('pass');
    expect(results.find((r) => r.id === 'PKG-VERSION-VALID')?.status).toBe('pass');
    expect(results.find((r) => r.id === 'PKG-LICENSE-VALID')?.status).toBe('pass');
    expect(results.find((r) => r.id.startsWith('PKG-ENTRY-VALID-main'))?.status).toBe('pass');
    expect(results.find((r) => r.id.startsWith('PKG-ENTRY-VALID-types'))?.status).toBe('pass');
  });

  it('fails when package.json has invalid semver format', async () => {
    const context = createMockContext({
      'package.json': JSON.stringify({
        name: 'pkg',
        version: 'v1.0', // Not semver (has 'v' and missing patch)
      }),
    });

    const results = await runPackageChecks(context, DEFAULT_CONFIG.packageMetadata);

    const semverRes = results.find((r) => r.id === 'PKG-VERSION-SEMVER');
    expect(semverRes?.status).toBe('fail');
    expect(semverRes?.message).toContain('Semantic Version');
  });

  it('fails when declared entry points do not exist on disk', async () => {
    const context = createMockContext({
      'package.json': JSON.stringify({
        name: 'pkg',
        version: '1.0.0',
        main: 'dist/index.js', // File is not in context!
      }),
    });

    const results = await runPackageChecks(context, DEFAULT_CONFIG.packageMetadata);

    const missingEntry = results.find((r) => r.id.startsWith('PKG-ENTRY-MISSING-main'));
    expect(missingEntry?.status).toBe('fail');
    expect(missingEntry?.message).toContain('does not exist on disk');
  });

  it('warns when development artifacts are included in files whitelist', async () => {
    const context = createMockContext({
      'package.json': JSON.stringify({
        name: 'pkg',
        version: '1.0.0',
        files: ['dist', 'tests', '.env'],
      }),
    });

    const results = await runPackageChecks(context, DEFAULT_CONFIG.packageMetadata);

    expect(
      results.some((r) => r.id.includes('PKG-FILES-DEV-ARTIFACT') && r.status === 'warn'),
    ).toBe(true);
  });
});
