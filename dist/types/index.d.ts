/**
 * Core type definitions for Release Readiness Action.
 */
export type Severity = 'error' | 'warning' | 'info';
export type Status = 'pass' | 'fail' | 'warn' | 'skip';
export type Category = 'structure' | 'documentation' | 'package' | 'scripts' | 'secrets' | 'dependencies' | 'git' | 'checklist' | 'custom';
export interface CheckResult {
    /** Unique identifier for the check (e.g. STRUC001, SEC001, PKG002) */
    id: string;
    /** High-level category of the check */
    category: Category;
    /** Human-readable title of the check */
    name: string;
    /** Result status of the check */
    status: Status;
    /** Severity level when failed or warned */
    severity: Severity;
    /** Detailed explanation of the outcome */
    message: string;
    /** Relevant file path, relative to working directory, if applicable */
    filePath?: string;
    /** Relevant line number (1-based), if applicable */
    line?: number;
    /** Relevant column number (1-based), if applicable */
    column?: number;
    /** Actionable recommendation to resolve the failure */
    remediation?: string;
    /** Redacted snippet or additional structured details */
    details?: Record<string, unknown>;
}
export interface CategorySummary {
    total: number;
    passed: number;
    warnings: number;
    errors: number;
    skipped: number;
}
export interface ReadinessSummary {
    totalChecks: number;
    passed: number;
    warnings: number;
    errors: number;
    skipped: number;
    durationMs: number;
}
export interface ReadinessReport {
    timestamp: string;
    workingDirectory: string;
    passed: boolean;
    failThreshold: 'error' | 'warning' | 'never';
    summary: ReadinessSummary;
    categories: Record<Category, CategorySummary>;
    results: CheckResult[];
    metadata?: Record<string, unknown>;
}
export interface CollectedFile {
    relativePath: string;
    absolutePath: string;
    sizeBytes: number;
    extension: string;
}
export interface EngineContext {
    workingDirectory: string;
    files: CollectedFile[];
    hasFile: (relativePath: string) => boolean;
    readFile: (relativePath: string) => string | null;
    readJson: <T = unknown>(relativePath: string) => T | null;
    getFileSize: (relativePath: string) => number | null;
}
//# sourceMappingURL=index.d.ts.map