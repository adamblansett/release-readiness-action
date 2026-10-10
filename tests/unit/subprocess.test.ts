import { describe, it, expect } from 'vitest';
import { executeSubprocess } from '../../src/utils/subprocess.js';

describe('Safe Subprocess Execution', () => {
  it('executes command successfully with arguments array', async () => {
    const result = await executeSubprocess('node', [
      '-e',
      'console.log("hello stdout"); process.stderr.write("hello stderr");',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello stdout');
    expect(result.stderr.trim()).toBe('hello stderr');
    expect(result.timedOut).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('captures non-zero exit codes correctly', async () => {
    const result = await executeSubprocess('node', ['-e', 'process.exit(42);']);

    expect(result.exitCode).toBe(42);
    expect(result.timedOut).toBe(false);
  });

  it('handles missing executable gracefully without uncaught exceptions', async () => {
    const result = await executeSubprocess('non_existent_binary_xyz_123', ['--arg']);

    expect(result.exitCode).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('enforces timeout and terminates long-running processes', async () => {
    const result = await executeSubprocess('node', ['-e', 'setTimeout(() => {}, 10000);'], {
      timeoutMs: 300,
    });

    expect(result.timedOut).toBe(true);
  });

  it('bounds output buffer when output exceeds maxOutputBytes', async () => {
    const result = await executeSubprocess('node', ['-e', 'console.log("A".repeat(5000));'], {
      maxOutputBytes: 100,
    });

    expect(result.stdout.length).toBeLessThan(1500);
    expect(result.stdout).toContain('[Process stdout truncated');
  });
});
