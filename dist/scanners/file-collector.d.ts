import type { CollectedFile, EngineContext } from '../types/index.js';
export interface FileCollectorOptions {
    workingDirectory: string;
    excludePatterns?: string[];
    maxFileSizeKb?: number;
}
export declare class FileCollector {
    private readonly workingDirectory;
    private readonly excludePatterns;
    private readonly maxFileSizeKb;
    constructor(options: FileCollectorOptions);
    getMaxFileSizeKb(): number;
    /**
     * Collects all eligible files within the working directory.
     */
    collect(): CollectedFile[];
    isExcluded(relPath: string): boolean;
    /**
     * Creates an EngineContext for checks to safely read files.
     */
    createContext(collectedFiles?: CollectedFile[]): EngineContext;
}
//# sourceMappingURL=file-collector.d.ts.map