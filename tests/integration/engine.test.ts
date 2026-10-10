import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ReleaseReadinessEngine } from '../../src/core/engine.js';
import { loadConfig } from '../../src/config/loader.js';

describe('ReleaseReadinessEngine Integration Tests', () => {
  const fixturesDir = join(process.cwd(), 'tests/fixtures/integration-temp');
  const compliantDir = join(fixturesDir, 'compliant');
  const failingDir = join(fixturesDir, 'failing');
  const secretLeakDir = join(fixturesDir, 'secret-leak');

  beforeAll(() => {
    mkdirSync(fixturesDir, { recursive: true });

    // 1. Compliant project
    mkdirSync(join(compliantDir, '.github/workflows'), { recursive: true });
    mkdirSync(join(compliantDir, 'dist'), { recursive: true });
    writeFileSync(
      join(compliantDir, 'README.md'),
      '# Compliant Project\nProduction ready software release.',
    );
    writeFileSync(join(compliantDir, 'LICENSE'), 'MIT License\nCopyright (c) 2026 Test Suite');
    writeFileSync(join(compliantDir, '.github/workflows/ci.yml'), 'name: CI\non: [push]');
    writeFileSync(
      join(compliantDir, 'package.json'),
      JSON.stringify({
        name: 'compliant-project',
        version: '1.0.0',
        description: 'Compliant production library',
        license: 'MIT',
        main: 'dist/index.js',
        scripts: { test: 'vitest run', build: 'tsc' },
      }),
    );
    writeFileSync(join(compliantDir, 'package-lock.json'), '{"lockfileVersion": 3}');
    writeFileSync(join(compliantDir, 'dist/index.js'), 'export const ready = true;');
    writeFileSync(
      join(compliantDir, 'RELEASE_CHECKLIST.md'),
      '# Checklist\n- [x] Run unit tests\n- [x] Build artifacts',
    );

    // 2. Failing project
    mkdirSync(failingDir, { recursive: true });
    writeFileSync(
      join(failingDir, 'package.json'),
      JSON.stringify({
        name: 'failing-project',
        version: 'invalid-semver',
        main: 'dist/non-existent.js',
      }),
    );
    writeFileSync(
      join(failingDir, 'RELEASE_CHECKLIST.md'),
      '# Checklist\n- [ ] Unfinished release review task',
    );

    // 3. Secret leak project
    mkdirSync(join(secretLeakDir, 'src'), { recursive: true });
    writeFileSync(
      join(secretLeakDir, 'README.md'),
      '# Secret Leak Project\nDocumentation present.',
    );
    writeFileSync(join(secretLeakDir, 'LICENSE'), 'MIT License');
    writeFileSync(
      join(secretLeakDir, 'src/secrets.ts'),
      'const awsKey = "AKIAIOSFODNN7EXAMPLE"; // Synthetic test credential',
    );
  });

  afterAll(() => {
    try {
      rmSync(fixturesDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('passes evaluation for a fully compliant release-ready project', async () => {
    const { config } = loadConfig({ cwd: compliantDir });
    const engine = new ReleaseReadinessEngine(config);
    const report = await engine.evaluate();

    expect(report.passed).toBe(true);
    expect(report.summary.errors).toBe(0);
    expect(report.summary.passed).toBeGreaterThan(5);
  });

  it('fails evaluation when critical project requirements are missing or broken', async () => {
    const { config } = loadConfig({ cwd: failingDir });
    const engine = new ReleaseReadinessEngine(config);
    const report = await engine.evaluate();

    expect(report.passed).toBe(false);
    expect(report.summary.errors).toBeGreaterThan(0);

    // Should catch missing README and LICENSE
    expect(report.results.some((r) => r.id === 'STRUC-README' && r.status === 'fail')).toBe(true);
    expect(report.results.some((r) => r.id === 'STRUC-LICENSE' && r.status === 'fail')).toBe(true);

    // Should catch invalid semver
    expect(report.results.some((r) => r.id === 'PKG-VERSION-SEMVER' && r.status === 'fail')).toBe(
      true,
    );

    // Should catch missing entry point
    expect(
      report.results.some((r) => r.id.startsWith('PKG-ENTRY-MISSING') && r.status === 'fail'),
    ).toBe(true);

    // Should catch incomplete checklist
    expect(report.results.some((r) => r.id === 'CHK-PENDING-TASKS' && r.status === 'fail')).toBe(
      true,
    );
  });

  it('fails evaluation immediately when an exposed secret is detected', async () => {
    const { config } = loadConfig({ cwd: secretLeakDir });
    const engine = new ReleaseReadinessEngine(config);
    const report = await engine.evaluate();

    expect(report.passed).toBe(false);
    const secretResult = report.results.find((r) => r.id === 'SEC-AWS-01');
    expect(secretResult).toBeDefined();
    expect(secretResult?.status).toBe('fail');
  });
});
