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
export declare function executeSubprocess(command: string, args?: string[], options?: SubprocessOptions): Promise<SubprocessResult>;
//# sourceMappingURL=subprocess.d.ts.map