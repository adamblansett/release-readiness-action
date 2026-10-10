import { describe, it, expect } from 'vitest';
import { runDependencyChecks } from '../../src/checks/dependencies.js';
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

describe('Dependency Checks', () => {
  it('passes when a single lockfile is committed', async () => {
    const context = createMockContext({
      'package.json': '{"name": "pkg"}',
      'package-lock.json': '{"name": "pkg", "lockfileVersion": 3}',
    });

    const results = await runDependencyChecks(context, DEFAULT_CONFIG.dependencies);

    expect(results.find((r) => r.id === 'DEP-LOCKFILE-FOUND')?.status).toBe('pass');
  });

  it('fails when no lockfile exists for a Node.js project', async () => {
    const context = createMockContext({
      'package.json': '{"name": "pkg"}',
    });

    const results = await runDependencyChecks(context, DEFAULT_CONFIG.dependencies);

    expect(results.find((r) => r.id === 'DEP-LOCKFILE-MISSING')?.status).toBe('fail');
  });

  it('warns when multiple conflicting lockfiles exist simultaneously', async () => {
    const context = createMockContext({
      'package.json': '{"name": "pkg"}',
      'package-lock.json': '{}',
      'yarn.lock': '# yarn lockfile',
    });

    const results = await runDependencyChecks(context, DEFAULT_CONFIG.dependencies);

    expect(results.find((r) => r.id === 'DEP-LOCKFILE-CONFLICT')?.status).toBe('warn');
  });
});
