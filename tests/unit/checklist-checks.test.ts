import { describe, it, expect } from 'vitest';
import { runChecklistChecks } from '../../src/checks/checklist.js';
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

describe('Checklist Checks', () => {
  it('detects uncompleted checklist tasks (- [ ]) in release checklist file', () => {
    const context = createMockContext({
      'RELEASE_CHECKLIST.md': `
# Release Checklist
- [x] Run automated tests
- [ ] Verify production documentation
- [ ] Tag git commit
`,
    });

    const results = runChecklistChecks(context, DEFAULT_CONFIG.checklist);

    const pending = results.find((r) => r.id === 'CHK-PENDING-TASKS');
    expect(pending).toBeDefined();
    expect(pending?.status).toBe('fail');
    expect(pending?.message).toContain('2 of 3 release checklist tasks are not completed');
  });

  it('passes when all checklist tasks are marked complete (- [x])', () => {
    const context = createMockContext({
      'RELEASE_CHECKLIST.md': `
# Release Checklist
- [x] Run automated tests
- [x] Verify production documentation
- [x] Tag git commit
`,
    });

    const results = runChecklistChecks(context, DEFAULT_CONFIG.checklist);

    const allCompleted = results.find((r) => r.id === 'CHK-ALL-COMPLETED');
    expect(allCompleted).toBeDefined();
    expect(allCompleted?.status).toBe('pass');
  });
});
