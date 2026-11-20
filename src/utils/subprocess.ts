import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

const SAFE_ENV_KEYS = [
  'PATH',
  'HOME',
  'TMPDIR',
  'TMP',
  'TEMP',
  'CI',
  'NODE_ENV',
  'SystemRoot',
  'SYSTEMROOT',
  'ComSpec',
  'COMSPEC',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'PATHEXT',
  'NUMBER_OF_PROCESSORS',
] as const;

function buildSafeEnv(extraEnv?: Record<string, string>): NodeJS.ProcessEnv {
  const safeEnv: NodeJS.ProcessEnv = {};
  for (const key of SAFE_ENV_KEYS) {
    const val = process.env[key];
    if (val !== undefined) {
      safeEnv[key] = val;
    }
  }
  if (!safeEnv.TMPDIR) {
    safeEnv.TMPDIR = process.env.TMPDIR || process.env.TMP || '/tmp';
  }
  if (extraEnv) {
    Object.assign(safeEnv, extraEnv);
  }
  return safeEnv;
}

function resolveCommand(
  command: string,
  args: string[],
  shell: boolean,
): { executable: string; spawnArgs: string[] } {
  if (process.platform === 'win32' && !shell && (command === 'npm' || command === 'npx')) {
    const cliFile = command === 'npm' ? 'npm-cli.js' : 'npx-cli.js';
    const cliPath = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', cliFile);
    if (existsSync(cliPath)) {
      return {
        executable: process.execPath,
        spawnArgs: [cliPath, ...args],
      };
    }
  }

  return {
    executable: command,
    spawnArgs: args,
  };
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
  const safeEnv = buildSafeEnv(env);
  const { executable, spawnArgs } = resolveCommand(command, args, shell);

  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(executable, spawnArgs, {
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
