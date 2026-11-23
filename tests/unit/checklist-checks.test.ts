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

  it('verifies checklist.requiredItems against completed, pending, missing items, and missing file', () => {
    const context = createMockContext({
      'RELEASE_CHECKLIST.md': [
        '# Release Checklist',
        '- [x] Security review complete',
        '- [ ] Load test verified',
      ].join('\n'),
    });

    const results = runChecklistChecks(context, {
      ...DEFAULT_CONFIG.checklist,
      requireAllCompleted: false,
      requiredItems: ['Security review', 'Load test', 'Rollback plan'],
    });

    const securityRes = results.find((r) => r.name.includes('Security review'));
    expect(securityRes?.status).toBe('pass');

    const loadRes = results.find((r) => r.name.includes('Load test'));
    expect(loadRes?.status).toBe('fail');
    expect(loadRes?.line).toBe(3);

    const rollbackRes = results.find((r) => r.name.includes('Rollback plan'));
    expect(rollbackRes?.status).toBe('fail');
    expect(rollbackRes?.message).toContain('was not found');

    const emptyContext = createMockContext({});
    const missingFileResults = runChecklistChecks(emptyContext, {
      ...DEFAULT_CONFIG.checklist,
      requiredItems: ['Security review'],
    });
    expect(missingFileResults[0]?.status).toBe('fail');
    expect(missingFileResults[0]?.message).toContain('no release checklist file was found');
  });
});
