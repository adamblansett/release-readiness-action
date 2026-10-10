import { describe, it, expect } from 'vitest';
import { ReleaseReadinessConfigSchema } from '../../src/config/schema.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';
import { deepMerge, loadConfig } from '../../src/config/loader.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('Configuration System', () => {
  describe('Zod Schema Validation', () => {
    it('provides sensible defaults for all top-level settings', () => {
      const parsed = ReleaseReadinessConfigSchema.parse({});

      expect(parsed.failOn).toBe('error');
      expect(parsed.failOnSecrets).toBe(true);
      expect(parsed.structure.checkReadme).toBe(true);
      expect(parsed.structure.checkLicense).toBe(true);
      expect(parsed.structure.checkCiWorkflow).toBe(true);
      expect(parsed.secrets.enabled).toBe(true);
      expect(parsed.scripts.execute).toBe(false); // Safe default!
      expect(parsed.dependencies.audit).toBe(false); // Safe default!
      expect(DEFAULT_CONFIG.failOn).toBe('error');
    });

    it('rejects unknown configuration properties in strict mode', () => {
      expect(() => {
        ReleaseReadinessConfigSchema.parse({
          unknownField: 'malicious-or-typo',
        });
      }).toThrow();
    });

    it('rejects invalid enum values', () => {
      expect(() => {
        ReleaseReadinessConfigSchema.parse({
          failOn: 'invalid-threshold',
        });
      }).toThrow();
    });
  });

  describe('deepMerge', () => {
    it('correctly merges nested objects without mutating source', () => {
      const base = {
        failOn: 'error',
        structure: { checkReadme: true, checkLicense: true },
      };
      const override = {
        failOn: 'warning',
        structure: { checkLicense: false },
      };

      const merged = deepMerge(base, override);

      expect(merged.failOn).toBe('warning');
      expect(merged.structure.checkReadme).toBe(true);
      expect(merged.structure.checkLicense).toBe(false);
      expect(base.structure.checkLicense).toBe(true);
    });
  });

  describe('loadConfig with Files and Overrides', () => {
    const tempDir = join(process.cwd(), 'tests/fixtures/config-test-temp');

    beforeAll(() => {
      mkdirSync(tempDir, { recursive: true });
    });

    afterAll(() => {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    });

    it('loads and parses a YAML configuration file correctly', () => {
      const yamlPath = join(tempDir, '.release-readiness.yml');
      writeFileSync(
        yamlPath,
        `
failOn: warning
failOnSecrets: false
structure:
  checkChangelog: true
`,
        'utf-8',
      );

      const result = loadConfig({
        cwd: tempDir,
      });

      expect(result.source).toBe('file');
      expect(result.config.failOn).toBe('warning');
      expect(result.config.failOnSecrets).toBe(false);
      expect(result.config.structure.checkChangelog).toBe(true);
    });

    it('runtime overrides take precedence over file configuration', () => {
      const yamlPath = join(tempDir, '.release-readiness.yml');
      writeFileSync(yamlPath, 'failOn: warning\n', 'utf-8');

      const result = loadConfig({
        cwd: tempDir,
        overrides: { failOn: 'error' },
      });

      expect(result.config.failOn).toBe('error');
    });

    it('throws when specified config-path does not exist', () => {
      expect(() => {
        loadConfig({
          cwd: tempDir,
          configPath: 'non-existent-config.yml',
        });
      }).toThrow(/Config file not found/);
    });
  });
});
