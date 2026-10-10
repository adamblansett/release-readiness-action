import { describe, it, expect } from 'vitest';
import { runCustomRules } from '../../src/checks/custom.js';
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

describe('Custom Rules', () => {
  it('enforces file mustExist rule', () => {
    const context = createMockContext({
      'README.md': '# Hello',
    });

    const results = runCustomRules(context, [
      {
        id: 'CUST-01',
        name: 'Must Have Architecture Doc',
        file: 'docs/architecture.md',
        mustExist: true,
        severity: 'error',
      },
      {
        id: 'CUST-02',
        name: 'Must Have README',
        file: 'README.md',
        mustExist: true,
        severity: 'error',
      },
    ]);

    expect(results.find((r) => r.id === 'CUST-01')?.status).toBe('fail');
    expect(results.find((r) => r.id === 'CUST-02')?.status).toBe('pass');
  });

  it('enforces required pattern and forbidden pattern rules', () => {
    const context = createMockContext({
      'config.json': '{"env": "production", "debug": true}',
    });

    const results = runCustomRules(context, [
      {
        id: 'CUST-PAT-01',
        name: 'Must contain production env',
        file: 'config.json',
        pattern: '"env":\\s*"production"',
        severity: 'error',
      },
      {
        id: 'CUST-PAT-02',
        name: 'Must not enable debug in production',
        file: 'config.json',
        forbiddenPattern: '"debug":\\s*true',
        severity: 'error',
      },
    ]);

    expect(results.find((r) => r.id === 'CUST-PAT-01')?.status).toBe('pass');
    expect(results.find((r) => r.id === 'CUST-PAT-02')?.status).toBe('fail');
  });
});
