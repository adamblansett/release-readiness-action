import { resolve, relative, normalize } from 'node:path';

/**
 * Checks whether targetPath is strictly inside (or equal to) parentPath.
 * Prevents directory traversal attacks via symlinks or '..' components.
 */
export function isPathInside(parentPath: string, targetPath: string): boolean {
  const rel = relative(resolve(parentPath), resolve(targetPath));
  return !rel.startsWith('..') && !rel.startsWith('/');
}

/**
 * Normalizes a relative path to standard forward-slash format without leading './'.
 */
export function normalizeRelativePath(p: string): string {
  const normalized = normalize(p).replace(/\\/g, '/');
  return normalized.replace(/^\.\//, '');
}

/**
 * Lightweight, safe glob-style pattern matcher for file exclusions.
 * Supports:
 * - '**\/*' (match everything under directory, e.g. 'node_modules/**')
 * - '*.ext' (match file extension, e.g. '*.png')
 * - 'exact/path' (exact match or path prefix)
 */
export function matchesPattern(path: string, pattern: string): boolean {
  const normalizedPath = normalizeRelativePath(path);
  const normalizedPattern = normalizeRelativePath(pattern);

  // Exact match
  if (normalizedPath === normalizedPattern) {
    return true;
  }

  // Directory prefix with wildcard: e.g. "node_modules/**"
  if (normalizedPattern.endsWith('/**')) {
    const dirPrefix = normalizedPattern.slice(0, -3);
    if (normalizedPath === dirPrefix || normalizedPath.startsWith(dirPrefix + '/')) {
      return true;
    }
  }

  // Wildcard extension: e.g. "*.png" or "**/*.png"
  if (normalizedPattern.startsWith('*.') || normalizedPattern.startsWith('**/*.')) {
    const ext = normalizedPattern.split('.').pop();
    if (ext && normalizedPath.endsWith('.' + ext)) {
      return true;
    }
  }

  // Path suffix match: e.g. ".git" or ".git/**"
  if (
    normalizedPattern === '.git' &&
    (normalizedPath === '.git' || normalizedPath.startsWith('.git/'))
  ) {
    return true;
  }

  // Simple filename glob e.g. "*.lock"
  if (normalizedPattern.startsWith('*')) {
    const suffix = normalizedPattern.slice(1);
    if (normalizedPath.endsWith(suffix) || normalizedPath.split('/').pop()?.endsWith(suffix)) {
      return true;
    }
  }

  return false;
}
