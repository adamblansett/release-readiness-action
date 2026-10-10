import type { CheckResult, EngineContext } from '../types/index.js';
import type { ReleaseReadinessConfig } from '../config/schema.js';
export interface SecretPatternDef {
    id: string;
    name: string;
    regex: RegExp;
    extractValue?: (match: RegExpExecArray) => string;
}
export declare class SecretScanner {
    private readonly config;
    private readonly patterns;
    constructor(config: ReleaseReadinessConfig['secrets']);
    scan(context: EngineContext): CheckResult[];
}
//# sourceMappingURL=secret-scanner.d.ts.map