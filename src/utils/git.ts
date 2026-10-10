import { executeSubprocess } from './subprocess.js';

export interface GitStatusResult {
  isClean: boolean;
  modified: string[];
  untracked: string[];
  raw: string;
}

/**
 * Checks whether the specified directory is inside a Git working tree.
 */
export async function isGitRepo(cwd: string): Promise<boolean> {
  const result = await executeSubprocess('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd,
    timeoutMs: 5000,
  });
  return result.exitCode === 0 && result.stdout.trim() === 'true';
}

/**
 * Queries Git for uncommitted or untracked changes.
 */
export async function getGitStatus(cwd: string): Promise<GitStatusResult> {
  const result = await executeSubprocess('git', ['status', '--porcelain'], {
    cwd,
    timeoutMs: 10000,
  });

  if (result.exitCode !== 0) {
    return {
      isClean: true,
      modified: [],
      untracked: [],
      raw: '',
    };
  }

  const lines = result.stdout.split('\n').filter((l) => l.trim().length > 0);
  const modified: string[] = [];
  const untracked: string[] = [];

  for (const line of lines) {
    const status = line.slice(0, 2);
    const file = line.slice(3).trim();

    if (status.includes('?')) {
      untracked.push(file);
    } else {
      modified.push(file);
    }
  }

  return {
    isClean: lines.length === 0,
    modified,
    untracked,
    raw: result.stdout,
  };
}

/**
 * Retrieves the current git tag or release ref if available.
 */
export async function getCurrentGitTag(cwd: string): Promise<string | null> {
  // Check GITHUB_REF first if running inside GitHub Actions
  const githubRef = process.env.GITHUB_REF;
  if (githubRef && githubRef.startsWith('refs/tags/')) {
    return githubRef.replace('refs/tags/', '');
  }

  const result = await executeSubprocess('git', ['describe', '--tags', '--exact-match'], {
    cwd,
    timeoutMs: 5000,
  });

  if (result.exitCode === 0 && result.stdout.trim().length > 0) {
    return result.stdout.trim();
  }

  return null;
}

/**
 * Retrieves the current git branch name.
 */
export async function getCurrentGitBranch(cwd: string): Promise<string | null> {
  // Check GITHUB_REF_NAME or GITHUB_HEAD_REF if running inside GitHub Actions
  if (process.env.GITHUB_HEAD_REF) {
    return process.env.GITHUB_HEAD_REF;
  }
  if (process.env.GITHUB_REF_NAME) {
    return process.env.GITHUB_REF_NAME;
  }

  const result = await executeSubprocess('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd,
    timeoutMs: 5000,
  });

  if (result.exitCode === 0 && result.stdout.trim().length > 0) {
    return result.stdout.trim();
  }

  return null;
}
