import { ReleaseReadinessConfigSchema, type ReleaseReadinessConfig } from './schema.js';

/**
 * Default configuration instance validated through Zod schema.
 */
export const DEFAULT_CONFIG: ReleaseReadinessConfig = ReleaseReadinessConfigSchema.parse({});
