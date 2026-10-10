import type { CheckResult, EngineContext } from '../types/index.js';
import type { ReleaseReadinessConfig } from '../config/schema.js';
import { getCurrentGitTag } from '../utils/git.js';
import { normalizeRelativePath } from '../utils/path-utils.js';

// Strict Semantic Versioning Regex (semver.org)
const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

// Valid npm package name regex
const NPM_PACKAGE_NAME_REGEX = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export async function runPackageChecks(
  context: EngineContext,
  config: ReleaseReadinessConfig['packageMetadata'],
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  if (!config.enabled) {
    return results;
  }

  if (!context.hasFile('package.json')) {
    // Non-Node project or package.json not present
    return results;
  }

  const pkgJsonRaw = context.readFile('package.json');
  if (!pkgJsonRaw) {
    results.push({
      id: 'PKG-READ-ERR',
      category: 'package',
      name: 'Read package.json',
      status: 'fail',
      severity: 'error',
      filePath: 'package.json',
      message: 'Failed to read package.json content.',
      remediation: 'Ensure package.json is accessible and readable.',
    });
    return results;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(pkgJsonRaw);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'PKG-JSON-SYNTAX',
      category: 'package',
      name: 'Valid package.json Syntax',
      status: 'fail',
      severity: 'error',
      filePath: 'package.json',
      message: `package.json contains invalid JSON syntax: ${msg}`,
      remediation: 'Correct JSON syntax in package.json.',
    });
    return results;
  }

  // 1. Package Name
  if (config.requireName) {
    if (!pkg.name || typeof pkg.name !== 'string' || pkg.name.trim().length === 0) {
      results.push({
        id: 'PKG-NAME-REQ',
        category: 'package',
        name: 'Package Name Presence',
        status: 'fail',
        severity: 'error',
        filePath: 'package.json',
        message: 'Missing or empty "name" field in package.json.',
        remediation: 'Specify a valid package name in package.json.',
      });
    } else {
      const isPrivate = Boolean(pkg.private);
      if (!isPrivate && !NPM_PACKAGE_NAME_REGEX.test(pkg.name)) {
        results.push({
          id: 'PKG-NAME-FORMAT',
          category: 'package',
          name: 'Package Name Format',
          status: 'warn',
          severity: 'warning',
          filePath: 'package.json',
          message: `Package name "${pkg.name}" does not follow standard npm naming conventions.`,
          remediation:
            'Use lowercase letters, numbers, hyphens, and optional scope (e.g. @scope/name).',
        });
      } else {
        results.push({
          id: 'PKG-NAME-VALID',
          category: 'package',
          name: 'Package Name',
          status: 'pass',
          severity: 'info',
          filePath: 'package.json',
          message: `Package name "${pkg.name}" is valid.`,
        });
      }
    }
  }

  // 2. Package Version & Semver
  if (config.requireVersion) {
    if (!pkg.version || typeof pkg.version !== 'string') {
      results.push({
        id: 'PKG-VERSION-REQ',
        category: 'package',
        name: 'Package Version Presence',
        status: 'fail',
        severity: 'error',
        filePath: 'package.json',
        message: 'Missing or invalid "version" field in package.json.',
        remediation: 'Specify a valid version in package.json.',
      });
    } else if (config.validateSemver) {
      if (!SEMVER_REGEX.test(pkg.version)) {
        results.push({
          id: 'PKG-VERSION-SEMVER',
          category: 'package',
          name: 'Semantic Versioning Format',
          status: 'fail',
          severity: 'error',
          filePath: 'package.json',
          message: `Version "${pkg.version}" is not a valid Semantic Version (expected format X.Y.Z[-prerelease]).`,
          remediation: 'Update package.json version to comply with SemVer 2.0.0 (e.g., 1.0.0).',
        });
      } else {
        results.push({
          id: 'PKG-VERSION-VALID',
          category: 'package',
          name: 'Package Version',
          status: 'pass',
          severity: 'info',
          filePath: 'package.json',
          message: `Package version "${pkg.version}" conforms to SemVer.`,
        });
      }
    }
  }

  // 3. Package Description
  if (config.requireDescription) {
    if (
      !pkg.description ||
      typeof pkg.description !== 'string' ||
      pkg.description.trim().length === 0
    ) {
      results.push({
        id: 'PKG-DESC-REQ',
        category: 'package',
        name: 'Package Description',
        status: 'fail',
        severity: 'warning',
        filePath: 'package.json',
        message: 'Missing or empty "description" in package.json.',
        remediation: 'Add a concise description explaining what the package does.',
      });
    }
  }

  // 4. Package License
  if (config.requireLicense) {
    if (!pkg.license || typeof pkg.license !== 'string' || pkg.license.trim().length === 0) {
      results.push({
        id: 'PKG-LICENSE-REQ',
        category: 'package',
        name: 'Package License Field',
        status: 'fail',
        severity: 'warning',
        filePath: 'package.json',
        message: 'Missing "license" field in package.json.',
        remediation:
          'Add a valid SPDX license identifier (e.g. "MIT", "Apache-2.0") or "UNLICENSED".',
      });
    } else {
      results.push({
        id: 'PKG-LICENSE-VALID',
        category: 'package',
        name: 'Package License',
        status: 'pass',
        severity: 'info',
        filePath: 'package.json',
        message: `Package license declared as "${pkg.license}".`,
      });
    }
  }

  // 5. Repository Field
  if (config.requireRepository) {
    if (!pkg.repository) {
      results.push({
        id: 'PKG-REPO-REQ',
        category: 'package',
        name: 'Repository Field',
        status: 'fail',
        severity: 'warning',
        filePath: 'package.json',
        message: 'Missing "repository" field in package.json.',
        remediation: 'Add a "repository" field linking to the source code repository.',
      });
    }
  }

  // 6. Declared Entry Points Verification (main, module, types, bin, exports)
  if (config.validateEntryPoints) {
    const entryPointsToCheck: Array<{ field: string; path: string }> = [];

    if (typeof pkg.main === 'string') {
      entryPointsToCheck.push({ field: 'main', path: pkg.main });
    }
    if (typeof pkg.module === 'string') {
      entryPointsToCheck.push({ field: 'module', path: pkg.module });
    }
    if (typeof pkg.types === 'string') {
      entryPointsToCheck.push({ field: 'types', path: pkg.types });
    }
    if (typeof pkg.typings === 'string') {
      entryPointsToCheck.push({ field: 'typings', path: pkg.typings });
    }

    if (typeof pkg.bin === 'string') {
      entryPointsToCheck.push({ field: 'bin', path: pkg.bin });
    } else if (pkg.bin && typeof pkg.bin === 'object') {
      for (const [binName, binPath] of Object.entries(pkg.bin)) {
        if (typeof binPath === 'string') {
          entryPointsToCheck.push({ field: `bin.${binName}`, path: binPath });
        }
      }
    }

    // Helper to recursively collect exports file targets
    const collectExports = (exp: unknown, prefix = 'exports') => {
      if (typeof exp === 'string') {
        entryPointsToCheck.push({ field: prefix, path: exp });
      } else if (exp && typeof exp === 'object') {
        for (const [key, val] of Object.entries(exp)) {
          collectExports(val, `${prefix}.${key}`);
        }
      }
    };
    if (pkg.exports) {
      collectExports(pkg.exports);
    }

    for (const ep of entryPointsToCheck) {
      const cleanPath = normalizeRelativePath(ep.path);
      // Skip wildcard export patterns like "./*"
      if (cleanPath.includes('*')) continue;

      if (!context.hasFile(cleanPath)) {
        results.push({
          id: `PKG-ENTRY-MISSING-${ep.field.replace(/[^a-zA-Z0-9]/g, '_')}`,
          category: 'package',
          name: `Declared Entry Point Exists: ${ep.field}`,
          status: 'fail',
          severity: 'error',
          filePath: 'package.json',
          message: `Declared entry point "${ep.field}" points to "${cleanPath}" which does not exist on disk.`,
          remediation: `Ensure build artifacts are generated (e.g. run "npm run build") before release evaluation, or fix the "${ep.field}" path in package.json.`,
        });
      } else {
        results.push({
          id: `PKG-ENTRY-VALID-${ep.field.replace(/[^a-zA-Z0-9]/g, '_')}`,
          category: 'package',
          name: `Declared Entry Point Exists: ${ep.field}`,
          status: 'pass',
          severity: 'info',
          filePath: cleanPath,
          message: `Entry point "${ep.field}" (${cleanPath}) exists on disk.`,
        });
      }
    }
  }

  // 7. Files Whitelist Validation (Check for accidental dev artifacts in publishable package)
  if (config.validateFilesWhitelist && Array.isArray(pkg.files)) {
    const suspectPatterns = ['.env', 'test', 'tests', '__tests__', 'coverage', '.tsbuildinfo'];
    for (const entry of pkg.files) {
      if (typeof entry === 'string') {
        for (const suspect of suspectPatterns) {
          if (entry === suspect || entry.startsWith(suspect + '/')) {
            results.push({
              id: `PKG-FILES-DEV-ARTIFACT-${entry.replace(/[^a-zA-Z0-9]/g, '_')}`,
              category: 'package',
              name: 'Package Files Whitelist',
              status: 'warn',
              severity: 'warning',
              filePath: 'package.json',
              message: `The "files" array in package.json includes "${entry}", which may accidentally expose development artifacts in published packages.`,
              remediation: `Review the "files" array in package.json and remove unnecessary test or environment directories.`,
            });
          }
        }
      }
    }
  }

  // 8. Tag vs Version Match Check
  if (config.checkTagVersionMatch) {
    const gitTag = await getCurrentGitTag(context.workingDirectory);
    if (gitTag) {
      // Normalize tag by stripping optional leading 'v'
      const normalizedTag = gitTag.replace(/^v/, '');
      if (normalizedTag === pkg.version) {
        results.push({
          id: 'PKG-TAG-MATCH',
          category: 'package',
          name: 'Git Tag Version Match',
          status: 'pass',
          severity: 'info',
          message: `Git tag "${gitTag}" matches package.json version "${pkg.version}".`,
        });
      } else {
        results.push({
          id: 'PKG-TAG-MATCH',
          category: 'package',
          name: 'Git Tag Version Match',
          status: 'fail',
          severity: 'error',
          filePath: 'package.json',
          message: `Git tag "${gitTag}" does not match package.json version "${pkg.version}".`,
          remediation: `Align git tag with package version or update package.json version to "${normalizedTag}".`,
        });
      }
    }
  }

  return results;
}
