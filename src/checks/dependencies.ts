import type { CheckResult, EngineContext } from '../types/index.js';
import type { ReleaseReadinessConfig } from '../config/schema.js';
import { executeSubprocess } from '../utils/subprocess.js';

const KNOWN_LOCKFILES = [
  { name: 'package-lock.json', manager: 'npm' },
  { name: 'pnpm-lock.yaml', manager: 'pnpm' },
  { name: 'yarn.lock', manager: 'yarn' },
  { name: 'bun.lockb', manager: 'bun' },
];

export async function runDependencyChecks(
  context: EngineContext,
  config: ReleaseReadinessConfig['dependencies'],
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const hasPackageJson = context.hasFile('package.json');
  if (!hasPackageJson) {
    return results;
  }

  const pkg = context.readJson<Record<string, unknown>>('package.json');
  const detectedLockfiles = KNOWN_LOCKFILES.filter((l) => context.hasFile(l.name));

  // 1. Lockfile Presence
  if (config.checkLockfile) {
    if (detectedLockfiles.length === 0) {
      results.push({
        id: 'DEP-LOCKFILE-MISSING',
        category: 'dependencies',
        name: 'Lockfile Presence',
        status: 'fail',
        severity: 'error',
        filePath: 'package.json',
        message:
          'No dependency lockfile detected (package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lockb). A committed lockfile is required for deterministic release builds.',
        remediation:
          'Run your package manager install command (e.g., "npm install") and commit the generated lockfile to version control.',
      });
    } else {
      const lockNames = detectedLockfiles.map((l) => l.name).join(', ');
      results.push({
        id: 'DEP-LOCKFILE-FOUND',
        category: 'dependencies',
        name: 'Lockfile Presence',
        status: 'pass',
        severity: 'info',
        filePath: detectedLockfiles[0]?.name,
        message: `Committed dependency lockfile detected: ${lockNames}.`,
      });
    }
  }

  // 2. Conflicting Lockfiles Check
  if (config.checkMultipleLockfiles && detectedLockfiles.length > 1) {
    const lockNames = detectedLockfiles.map((l) => l.name).join(', ');
    results.push({
      id: 'DEP-LOCKFILE-CONFLICT',
      category: 'dependencies',
      name: 'Consistent Lockfile Configuration',
      status: 'warn',
      severity: 'warning',
      message: `Multiple conflicting lockfiles detected in repository root: ${lockNames}. This can lead to non-deterministic dependency installations across environments.`,
      remediation:
        'Standardize on a single package manager for the repository and delete superseded lockfiles.',
    });
  }

  // 3. packageManager field consistency
  if (pkg && typeof pkg.packageManager === 'string' && detectedLockfiles.length > 0) {
    const declaredManager = pkg.packageManager.split('@')[0]?.toLowerCase();
    const matchesAny = detectedLockfiles.some((l) => l.manager === declaredManager);
    if (!matchesAny) {
      results.push({
        id: 'DEP-MANAGER-MISMATCH',
        category: 'dependencies',
        name: 'Package Manager Consistency',
        status: 'warn',
        severity: 'warning',
        filePath: 'package.json',
        message: `package.json specifies packageManager "${pkg.packageManager}", but lockfile present is for ${detectedLockfiles.map((l) => l.manager).join(', ')}.`,
        remediation: 'Ensure the lockfile matches the package manager specified in package.json.',
      });
    }
  }

  // 4. Optional Dependency Audit (Network-enabled, requires explicit opt-in)
  if (config.audit) {
    const auditRes = await executeSubprocess('npm', ['audit', '--json'], {
      cwd: context.workingDirectory,
      timeoutMs: 30000,
    });

    if (auditRes.timedOut) {
      results.push({
        id: 'DEP-AUDIT-TIMEOUT',
        category: 'dependencies',
        name: 'Dependency Vulnerability Audit',
        status: 'fail',
        severity: 'warning',
        message: 'npm audit timed out after 30 seconds.',
        remediation: 'Check network connectivity or runner registry configuration.',
      });
    } else if (auditRes.error) {
      results.push({
        id: 'DEP-AUDIT-EXEC-ERR',
        category: 'dependencies',
        name: 'Dependency Vulnerability Audit',
        status: 'warn',
        severity: 'warning',
        message: `Failed to execute npm audit: ${auditRes.error.message}`,
        remediation: 'Ensure npm is available in the runner environment.',
      });
    } else {
      try {
        const auditData = JSON.parse(auditRes.stdout);
        const vulns = auditData.metadata?.vulnerabilities || auditData.vulnerabilities || {};
        const criticalCount = vulns.critical || 0;
        const highCount = vulns.high || 0;
        const moderateCount = vulns.moderate || 0;
        const totalCount =
          (vulns.total !== undefined ? vulns.total : criticalCount + highCount + moderateCount) ||
          0;

        const meetsThreshold =
          (config.auditLevel === 'critical' && criticalCount > 0) ||
          (config.auditLevel === 'high' && (criticalCount > 0 || highCount > 0)) ||
          (config.auditLevel === 'moderate' &&
            (criticalCount > 0 || highCount > 0 || moderateCount > 0)) ||
          (config.auditLevel === 'low' && totalCount > 0);

        if (meetsThreshold) {
          results.push({
            id: 'DEP-AUDIT-VULNS',
            category: 'dependencies',
            name: 'Dependency Vulnerability Audit',
            status: 'fail',
            severity: 'error',
            message: `Dependency audit detected vulnerabilities exceeding ${config.auditLevel} threshold (Critical: ${criticalCount}, High: ${highCount}, Moderate: ${moderateCount}).`,
            remediation: 'Run "npm audit fix" or upgrade vulnerable dependencies before release.',
            details: { vulnerabilities: vulns },
          });
        } else {
          results.push({
            id: 'DEP-AUDIT-PASS',
            category: 'dependencies',
            name: 'Dependency Vulnerability Audit',
            status: 'pass',
            severity: 'info',
            message: `Dependency audit passed with 0 vulnerabilities at or above ${config.auditLevel} severity (Note: audit verifies known vulnerabilities at scan time).`,
          });
        }
      } catch {
        results.push({
          id: 'DEP-AUDIT-PARSE-ERR',
          category: 'dependencies',
          name: 'Dependency Vulnerability Audit',
          status: 'warn',
          severity: 'warning',
          message: 'Unable to parse npm audit output.',
        });
      }
    }
  } else {
    results.push({
      id: 'DEP-AUDIT-OPTIN',
      category: 'dependencies',
      name: 'Dependency Vulnerability Audit',
      status: 'skip',
      severity: 'info',
      message:
        'Dependency vulnerability audit is disabled by default to prevent external network calls. Set "audit-dependencies: true" to enable.',
    });
  }

  return results;
}
