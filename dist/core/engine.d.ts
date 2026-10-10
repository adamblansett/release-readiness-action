import type { ReadinessReport } from '../types/index.js';
import type { ReleaseReadinessConfig } from '../config/schema.js';
import { FileCollector } from '../scanners/file-collector.js';
export interface EngineRunOptions {
    config: ReleaseReadinessConfig;
    customContext?: ReturnType<FileCollector['createContext']>;
}
export declare class ReleaseReadinessEngine {
    private readonly config;
    constructor(config: ReleaseReadinessConfig);
    evaluate(options?: {
        customContext?: ReturnType<FileCollector['createContext']>;
    }): Promise<ReadinessReport>;
}
//# sourceMappingURL=engine.d.ts.map