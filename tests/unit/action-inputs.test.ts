import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseActionInputs } from '../../src/action/inputs.js';

describe('GitHub Action Inputs Parsing', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear INPUT_* environment variables
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('INPUT_')) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('provides safe default inputs when no action inputs are set', () => {
    const inputs = parseActionInputs();

    expect(inputs.workingDirectory).toBe('.');
    expect(inputs.outputFormat).toBe('all');
    expect(inputs.createSummary).toBe(true);
    expect(inputs.annotateGitHub).toBe(true);
    expect(inputs.overrides.failOn).toBeUndefined();
  });

  it('correctly maps GitHub Action inputs to configuration overrides', () => {
    process.env['INPUT_FAIL-ON'] = 'warning';
    process.env['INPUT_FAIL-ON-SECRETS'] = 'false';
    process.env['INPUT_CHECK-SECRETS'] = 'false';
    process.env['INPUT_CHECK-UNCOMMITTED'] = 'true';
    process.env['INPUT_EXECUTE-SCRIPTS'] = 'true';
    process.env['INPUT_SCRIPTS-TO-RUN'] = 'test, lint, build';

    const inputs = parseActionInputs();

    expect(inputs.overrides.failOn).toBe('warning');
    expect(inputs.overrides.failOnSecrets).toBe(false);
    expect(inputs.overrides.secrets?.enabled).toBe(false);
    expect(inputs.overrides.git?.checkUncommitted).toBe(true);
    expect(inputs.overrides.scripts?.execute).toBe(true);
    expect(inputs.overrides.scripts?.commands).toHaveLength(3);
    expect(inputs.overrides.scripts?.commands?.[0]?.command).toBe('npm');
    expect(inputs.overrides.scripts?.commands?.[0]?.args).toEqual(['run', 'test']);
  });
});
