import { describe, it, expect } from 'vitest';
import { runDocumentationChecks } from '../../src/checks/documentation.js';
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

describe('Documentation Checks', () => {
  it('flags 0-byte or trivial documentation files', () => {
    const context = createMockContext({
      'README.md': '   ', // whitespace only
      'LICENSE.md': 'tiny', // 4 bytes < minFileSizeBytes (20)
    });

    const results = runDocumentationChecks(context, DEFAULT_CONFIG.documentation);

    expect(results.some((r) => r.id.startsWith('DOC-EMPTY-README_md') && r.status === 'fail')).toBe(
      true,
    );
    expect(
      results.some((r) => r.id.startsWith('DOC-EMPTY-LICENSE_md') && r.status === 'fail'),
    ).toBe(true);
  });

  it('warns on unresolved placeholders like TODO or [PROJECT NAME]', () => {
    const context = createMockContext({
      'README.md': '# Title\nThis is a project description with TODO items.',
    });

    const results = runDocumentationChecks(context, DEFAULT_CONFIG.documentation);

    const placeholderResult = results.find((r) => r.id.startsWith('DOC-PLACEHOLDER-'));
    expect(placeholderResult).toBeDefined();
    expect(placeholderResult?.status).toBe('warn');
    expect(placeholderResult?.line).toBe(2);
  });

  it('passes when documentation contains valid non-placeholder content', () => {
    const context = createMockContext({
      'README.md':
        '# Production Quality Project\nComplete guide for usage, configuration, and testing.',
      LICENSE: 'MIT License\nCopyright (c) 2026 Adam Blansett',
    });

    const results = runDocumentationChecks(context, DEFAULT_CONFIG.documentation);

    expect(results.every((r) => r.status === 'pass')).toBe(true);
  });
});
