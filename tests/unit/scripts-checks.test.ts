import { describe, it, expect } from 'vitest';
import { runScriptChecks } from '../../src/checks/scripts.js';
import type { EngineContext, CollectedFile } from '../../src/types/index.js';

function createMockContext(files: Record<string, string>): EngineContext {
  const collected: CollectedFile[] = Object.keys(files).map((path) => ({
    relativePath: path,
    absolutePath: `/mock/${path}`,
    sizeBytes: Buffer.byteLength(files[path] || '', 'utf-8'),
    extension: path.includes('.') ? `.${path.split('.').pop()}` : '',
  }));

  return {
    workingDirectory: process.cwd(),
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

describe('Script Checks with Execution', () => {
  it('executes configured validation commands when execute: true is opted in', async () => {
    const context = createMockContext({
      'package.json': JSON.stringify({
        name: 'pkg',
        scripts: { test: 'exit 0' },
      }),
    });

    const results = await runScriptChecks(context, {
      execute: true,
      requiredScripts: ['test'],
      commands: [
        {
          name: 'Echo Test',
          command: 'node',
          args: ['-e', 'console.log("ok"); process.exit(0);'],
          timeoutMs: 5000,
          required: true,
        },
      ],
      timeoutMs: 5000,
      maxOutputBytes: 1048576,
    });

    const execRes = results.find((r) => r.id === 'SCRIPT-EXEC-Echo_Test');
    expect(execRes).toBeDefined();
    expect(execRes?.status).toBe('pass');
  });

  it('reports failure when executed command returns non-zero exit code', async () => {
    const context = createMockContext({});

    const results = await runScriptChecks(context, {
      execute: true,
      requiredScripts: [],
      commands: [
        {
          name: 'Failing Command',
          command: 'node',
          args: ['-e', 'process.exit(1);'],
          timeoutMs: 5000,
          required: true,
        },
      ],
      timeoutMs: 5000,
      maxOutputBytes: 1048576,
    });

    const execRes = results.find((r) => r.id === 'SCRIPT-EXEC-Failing_Command');
    expect(execRes).toBeDefined();
    expect(execRes?.status).toBe('fail');
    expect(execRes?.severity).toBe('error');
  });
});
