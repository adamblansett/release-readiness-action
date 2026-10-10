import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ZodError } from 'zod';
import {
  ReleaseReadinessConfigSchema,
  type ReleaseReadinessConfig,
  type RawReleaseReadinessConfig,
} from './schema.js';

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

const CANDIDATE_CONFIG_FILES = [
  '.release-readiness.yml',
  '.release-readiness.yaml',
  '.release-readiness.json',
  'release-readiness.config.json',
  'release-readiness.config.yaml',
  'release-readiness.config.yml',
];

/**
 * Deeply merges two plain objects where override values take precedence.
 */
export function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result: Record<string, unknown> = { ...base };

  for (const key of Object.keys(override)) {
    const val = (override as Record<string, unknown>)[key];
    if (val === undefined) continue;

    const baseVal = result[key];
    if (
      val !== null &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      baseVal !== null &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(baseVal as Record<string, unknown>, val as Record<string, unknown>);
    } else {
      result[key] = val;
    }
  }

  return result as T;
}

/**
 * Loads and validates configuration from a file or falls back to defaults,
 * applying any provided runtime overrides.
 */
export function loadConfig(options: LoadConfigOptions = {}): LoadedConfigResult {
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd();
  let configFilePath: string | null = null;
  let rawFileConfig: Record<string, unknown> = {};

  if (options.configPath) {
    const specifiedPath = resolve(cwd, options.configPath);
    if (!existsSync(specifiedPath)) {
      throw new Error(`Config file not found at specified path: ${options.configPath}`);
    }
    configFilePath = specifiedPath;
  } else {
    for (const candidate of CANDIDATE_CONFIG_FILES) {
      const fullPath = join(cwd, candidate);
      if (existsSync(fullPath)) {
        configFilePath = fullPath;
        break;
      }
    }
  }

  if (configFilePath) {
    const content = readFileSync(configFilePath, 'utf-8');
    try {
      if (configFilePath.endsWith('.json')) {
        rawFileConfig = JSON.parse(content);
      } else {
        rawFileConfig = parseYaml(content) ?? {};
      }
    } catch (parseError: unknown) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(`Failed to parse configuration file "${configFilePath}": ${msg}`);
    }
  }

  // Base config sets workingDirectory to cwd
  const baseConfig = { workingDirectory: cwd, ...rawFileConfig };

  // Merge: file config + overrides
  const mergedRaw = options.overrides ? deepMerge(baseConfig, options.overrides) : baseConfig;

  try {
    const validated = ReleaseReadinessConfigSchema.parse(mergedRaw);
    return {
      config: validated,
      configFilePath,
      source: configFilePath ? 'file' : 'defaults',
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues
        .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(
        `Configuration validation error in ${configFilePath || 'options'}:\n${issues}`,
      );
    }
    throw error;
  }
}
