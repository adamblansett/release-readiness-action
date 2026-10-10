/**
 * Checks whether targetPath is strictly inside (or equal to) parentPath.
 * Prevents directory traversal attacks via symlinks or '..' components.
 */
export declare function isPathInside(parentPath: string, targetPath: string): boolean;
/**
 * Normalizes a relative path to standard forward-slash format without leading './'.
 */
export declare function normalizeRelativePath(p: string): string;
/**
 * Lightweight, safe glob-style pattern matcher for file exclusions.
 * Supports:
 * - '**\/*' (match everything under directory, e.g. 'node_modules/**')
 * - '*.ext' (match file extension, e.g. '*.png')
 * - 'exact/path' (exact match or path prefix)
 */
export declare function matchesPattern(path: string, pattern: string): boolean;
//# sourceMappingURL=path-utils.d.ts.map