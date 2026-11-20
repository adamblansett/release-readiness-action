export interface GitStatusResult {
    isClean: boolean;
    modified: string[];
    untracked: string[];
    raw: string;
}
/**
 * Checks whether the specified directory is inside a Git working tree.
 */
export declare function isGitRepo(cwd: string): Promise<boolean>;
/**
 * Queries Git for uncommitted or untracked changes.
 */
export declare function getGitStatus(cwd: string): Promise<GitStatusResult>;
/**
 * Retrieves the current git tag or release ref if available.
 */
export declare function getCurrentGitTag(cwd: string): Promise<string | null>;
/**
 * Retrieves the current git branch name.
 */
export declare function getCurrentGitBranch(cwd: string): Promise<string | null>;
/**
 * Returns normalized relative paths for untracked, non-ignored files in Git.
 */
export declare function getUntrackedGitFiles(cwd: string): Promise<Set<string>>;
