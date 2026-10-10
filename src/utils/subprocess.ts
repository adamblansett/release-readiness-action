import { spawn } from 'node:child_process';
import { truncateText } from './text.js';

export interface SubprocessOptions {
  cwd?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  env?: Record<string, string>;
  shell?: boolean;
}

export interface SubprocessResult {
  command: string;
  args: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
  error?: Error;
}

/**
 * Executes a subprocess safely with bounded output capture, configurable timeout,
 * and graceful process termination.
 */
export async function executeSubprocess(
  command: string,
  args: string[] = [],
  options: SubprocessOptions = {},
): Promise<SubprocessResult> {
  const {
    cwd = process.cwd(),
    timeoutMs = 60000,
    maxOutputBytes = 1024 * 1024, // 1MB buffer cap to prevent OOM
    env,
    shell = false,
  } = options;

  const startTime = Date.now();
  let timedOut = false;
  let stdoutBuffer = '';
  let stderrBuffer = '';
  let stdoutTruncated = false;
  let stderrTruncated = false;

  // Clean environment: inherit safe path and system vars, omit sensitive user env overrides
  const safeEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR || process.env.TMP || '/tmp',
    NODE_ENV: 'test',
    ...env,
  };

  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, args, {
        cwd,
        env: safeEnv,
        shell,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      return resolve({
        command,
        args,
        exitCode: null,
        stdout: '',
        stderr: '',
        timedOut: false,
        durationMs: Date.now() - startTime,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }

    let timeoutTimer: NodeJS.Timeout | null = null;
    let forceKillTimer: NodeJS.Timeout | null = null;

    if (timeoutMs > 0) {
      timeoutTimer = setTimeout(() => {
        timedOut = true;
        try {
          // Send SIGTERM first for graceful termination
          child.kill('SIGTERM');
        } catch {
          // Process might already be dead
        }

        // Escalate to SIGKILL after 2 seconds if still running
        forceKillTimer = setTimeout(() => {
          try {
            child.kill('SIGKILL');
          } catch {
            // Ignore
          }
        }, 2000);
      }, timeoutMs);
    }

    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdoutBuffer.length < maxOutputBytes) {
        stdoutBuffer += chunk.toString('utf-8');
        if (stdoutBuffer.length >= maxOutputBytes && !stdoutTruncated) {
          stdoutTruncated = true;
          stdoutBuffer =
            truncateText(stdoutBuffer, maxOutputBytes) +
            '\n[Process stdout truncated: maximum output limit reached]';
        }
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderrBuffer.length < maxOutputBytes) {
        stderrBuffer += chunk.toString('utf-8');
        if (stderrBuffer.length >= maxOutputBytes && !stderrTruncated) {
          stderrTruncated = true;
          stderrBuffer =
            truncateText(stderrBuffer, maxOutputBytes) +
            '\n[Process stderr truncated: maximum output limit reached]';
        }
      }
    });

    child.on('error', (err) => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (forceKillTimer) clearTimeout(forceKillTimer);

      resolve({
        command,
        args,
        exitCode: null,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        timedOut,
        durationMs: Date.now() - startTime,
        error: err,
      });
    });

    child.on('close', (code) => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (forceKillTimer) clearTimeout(forceKillTimer);

      resolve({
        command,
        args,
        exitCode: code,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        timedOut,
        durationMs: Date.now() - startTime,
      });
    });
  });
}
