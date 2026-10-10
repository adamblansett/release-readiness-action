import type { CheckResult, EngineContext } from '../types/index.js';
import type { ReleaseReadinessConfig } from '../config/schema.js';
import { executeSubprocess } from '../utils/subprocess.js';
import { truncateText } from '../utils/text.js';

export async function runScriptChecks(
  context: EngineContext,
  config: ReleaseReadinessConfig['scripts'],
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const pkg = context.readJson<Record<string, unknown>>('package.json');
  const availableScripts: Record<string, string> =
    pkg && typeof pkg.scripts === 'object' && pkg.scripts !== null
      ? (pkg.scripts as Record<string, string>)
      : {};

  // 1. Validate required scripts presence in package.json
  if (config.requiredScripts.length > 0) {
    for (const scriptName of config.requiredScripts) {
      if (availableScripts[scriptName]) {
        results.push({
          id: `SCRIPT-DEF-${scriptName.replace(/[^a-zA-Z0-9]/g, '_')}`,
          category: 'scripts',
          name: `Required Script Defined: "${scriptName}"`,
          status: 'pass',
          severity: 'info',
          filePath: 'package.json',
          message: `Required script "${scriptName}" is defined in package.json.`,
        });
      } else {
        results.push({
          id: `SCRIPT-DEF-${scriptName.replace(/[^a-zA-Z0-9]/g, '_')}`,
          category: 'scripts',
          name: `Required Script Defined: "${scriptName}"`,
          status: 'fail',
          severity: 'error',
          filePath: 'package.json',
          message: `Required script "${scriptName}" is not defined in package.json scripts.`,
          remediation: `Add a "${scriptName}" script to package.json scripts block.`,
        });
      }
    }
  }

  // 2. Safe execution of configured scripts/commands
  if (!config.execute) {
    if (config.requiredScripts.length > 0 || config.commands.length > 0) {
      results.push({
        id: 'SCRIPT-EXEC-OPTIN',
        category: 'scripts',
        name: 'Automated Script Execution',
        status: 'skip',
        severity: 'info',
        message:
          'Script execution is disabled by default for security. Set "execute-scripts: true" in action inputs to run validation commands automatically.',
      });
    }
    return results;
  }

  // If execution opted in, run configured commands
  for (const cmd of config.commands) {
    const subResult = await executeSubprocess(cmd.command, cmd.args, {
      cwd: context.workingDirectory,
      timeoutMs: cmd.timeoutMs || config.timeoutMs,
      maxOutputBytes: config.maxOutputBytes,
    });

    const isSuccess = subResult.exitCode === 0;
    const isRequired = cmd.required !== false;

    if (subResult.timedOut) {
      results.push({
        id: `SCRIPT-EXEC-${cmd.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'scripts',
        name: `Script Execution: ${cmd.name}`,
        status: 'fail',
        severity: isRequired ? 'error' : 'warning',
        message: `Command "${cmd.command} ${cmd.args.join(' ')}" timed out after ${cmd.timeoutMs || config.timeoutMs}ms.`,
        remediation: 'Investigate hanging operations or increase the command timeout setting.',
        details: {
          timedOut: true,
          durationMs: subResult.durationMs,
        },
      });
    } else if (subResult.error) {
      results.push({
        id: `SCRIPT-EXEC-${cmd.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'scripts',
        name: `Script Execution: ${cmd.name}`,
        status: 'fail',
        severity: isRequired ? 'error' : 'warning',
        message: `Failed to spawn executable "${cmd.command}": ${subResult.error.message}`,
        remediation: `Ensure "${cmd.command}" is installed and available on PATH in the runner environment.`,
      });
    } else if (!isSuccess) {
      const outputSnippet = truncateText(
        (
          subResult.stderr ||
          subResult.stdout ||
          'Command failed with exit code ' + subResult.exitCode
        ).trim(),
        500,
      );
      results.push({
        id: `SCRIPT-EXEC-${cmd.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'scripts',
        name: `Script Execution: ${cmd.name}`,
        status: 'fail',
        severity: isRequired ? 'error' : 'warning',
        message: `Command "${cmd.command} ${cmd.args.join(' ')}" failed with exit code ${subResult.exitCode}. Output: ${outputSnippet}`,
        remediation: `Resolve build/test errors causing "${cmd.name}" to exit with code ${subResult.exitCode}.`,
        details: {
          exitCode: subResult.exitCode,
          durationMs: subResult.durationMs,
        },
      });
    } else {
      results.push({
        id: `SCRIPT-EXEC-${cmd.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'scripts',
        name: `Script Execution: ${cmd.name}`,
        status: 'pass',
        severity: 'info',
        message: `Command "${cmd.command} ${cmd.args.join(' ')}" completed successfully in ${subResult.durationMs}ms.`,
        details: {
          durationMs: subResult.durationMs,
        },
      });
    }
  }

  return results;
}
