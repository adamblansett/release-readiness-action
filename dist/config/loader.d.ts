import { type ReleaseReadinessConfig, type RawReleaseReadinessConfig } from './schema.js';
export interface LoadConfigOptions {
    cwd?: string;
    configPath?: string;
    overrides?: Partial<RawReleaseReadinessConfig>;
}
export interface LoadedConfigResult {
    config: ReleaseReadinessConfig;
    configFilePath: string | null;
    source: 'file' | 'defaults';
}
export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};
/**
 * Deeply merges two plain objects where override values take precedence.
 */
export declare function deepMerge<T extends Record<string, unknown>>(base: T, override: DeepPartial<T>): T;
/**
 * Loads and validates configuration from a file or falls back to defaults,
 * applying any provided runtime overrides.
 */
export declare function loadConfig(options?: LoadConfigOptions): LoadedConfigResult;
