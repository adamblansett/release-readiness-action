import type { CheckResult, EngineContext } from '../types/index.js';
import type { ReleaseReadinessConfig } from '../config/schema.js';
import { isGitRepo, getGitStatus, getCurrentGitBranch } from '../utils/git.js';

export async function runGitChecks(
  context: EngineContext,
  config: ReleaseReadinessConfig['git'],
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const inGit = await isGitRepo(context.workingDirectory);
  if (!inGit) {
    if (config.checkUncommitted || config.checkBranch) {
      results.push({
        id: 'GIT-NOT-REPO',
        category: 'git',
        name: 'Git Repository Status',
        status: 'warn',
        severity: 'warning',
        message: 'The working directory is not a Git repository or .git is absent.',
      });
    }
    return results;
  }

  // 1. Uncommitted Changes Check
  if (config.checkUncommitted) {
    const status = await getGitStatus(context.workingDirectory);
    if (!status.isClean) {
      const summary = [
        status.modified.length > 0 ? `${status.modified.length} modified` : null,
        status.untracked.length > 0 ? `${status.untracked.length} untracked` : null,
      ]
        .filter(Boolean)
        .join(', ');

      results.push({
        id: 'GIT-DIRTY-TREE',
        category: 'git',
        name: 'Clean Git Working Tree',
        status: 'fail',
        severity: 'error',
        message: `Working tree has uncommitted changes (${summary}). Release builds must be reproducible from committed revisions.`,
        remediation:
          'Commit all release artifacts and source modifications, or add untracked build outputs to .gitignore.',
        details: {
          modified: status.modified.slice(0, 10),
          untracked: status.untracked.slice(0, 10),
        },
      });
    } else {
      results.push({
        id: 'GIT-CLEAN-TREE',
        category: 'git',
        name: 'Clean Git Working Tree',
        status: 'pass',
        severity: 'info',
        message: 'Git working tree is completely clean (no uncommitted or untracked changes).',
      });
    }
  }

  // 2. Allowed Branch Check
  if (config.checkBranch) {
    const currentBranch = await getCurrentGitBranch(context.workingDirectory);
    if (currentBranch) {
      const matchesBranch = config.allowedBranches.some((pat) => {
        if (pat.endsWith('*')) {
          return currentBranch.startsWith(pat.slice(0, -1));
        }
        return currentBranch === pat;
      });

      if (matchesBranch) {
        results.push({
          id: 'GIT-BRANCH-ALLOWED',
          category: 'git',
          name: 'Authorized Release Branch',
          status: 'pass',
          severity: 'info',
          message: `Current branch "${currentBranch}" is authorized for release.`,
        });
      } else {
        results.push({
          id: 'GIT-BRANCH-UNAUTHORIZED',
          category: 'git',
          name: 'Authorized Release Branch',
          status: 'fail',
          severity: 'error',
          message: `Current branch "${currentBranch}" is not in the allowed release branches list (${config.allowedBranches.join(', ')}).`,
          remediation: `Releases should only be triggered from designated branches: ${config.allowedBranches.join(', ')}.`,
        });
      }
    }
  }

  return results;
}
