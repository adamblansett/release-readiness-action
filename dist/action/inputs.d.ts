import type { RawReleaseReadinessConfig } from '../config/schema.js';
export interface ActionInputs {
    configPath?: string;
    workingDirectory: string;
    overrides: Partial<RawReleaseReadinessConfig>;
    outputFormat: 'all' | 'summary' | 'markdown' | 'json' | 'console';
    createSummary: boolean;
    annotateGitHub: boolean;
}
export declare function parseActionInputs(): ActionInputs;
//# sourceMappingURL=inputs.d.ts.map