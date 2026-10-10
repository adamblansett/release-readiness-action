import type { CheckResult, EngineContext } from '../types/index.js';
import type { ReleaseReadinessConfig } from '../config/schema.js';
import { getLocationFromIndex } from '../utils/text.js';

export function runCustomRules(
  context: EngineContext,
  rules: ReleaseReadinessConfig['customRules'],
): CheckResult[] {
  const results: CheckResult[] = [];

  for (const rule of rules) {
    const exists = context.hasFile(rule.file);

    if (rule.mustExist !== undefined) {
      if (rule.mustExist && !exists) {
        results.push({
          id: rule.id,
          category: 'custom',
          name: rule.name,
          status: 'fail',
          severity: rule.severity,
          filePath: rule.file,
          message:
            rule.message || `Custom rule "${rule.name}" failed: file "${rule.file}" must exist.`,
          remediation: `Create or restore "${rule.file}".`,
        });
        continue;
      } else if (!rule.mustExist && exists) {
        results.push({
          id: rule.id,
          category: 'custom',
          name: rule.name,
          status: 'fail',
          severity: rule.severity,
          filePath: rule.file,
          message:
            rule.message ||
            `Custom rule "${rule.name}" failed: file "${rule.file}" must not exist.`,
          remediation: `Remove "${rule.file}" from the repository.`,
        });
        continue;
      }
    }

    if (!exists) {
      continue;
    }

    const content = context.readFile(rule.file);
    if (!content) continue;

    if (rule.pattern) {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(content)) {
        results.push({
          id: rule.id,
          category: 'custom',
          name: rule.name,
          status: 'fail',
          severity: rule.severity,
          filePath: rule.file,
          message:
            rule.message ||
            `Custom rule "${rule.name}" failed: expected pattern "/${rule.pattern}/" not found in "${rule.file}".`,
          remediation: `Update "${rule.file}" to include the required pattern.`,
        });
        continue;
      }
    }

    if (rule.forbiddenPattern) {
      const regex = new RegExp(rule.forbiddenPattern);
      const match = regex.exec(content);
      if (match) {
        const loc = getLocationFromIndex(content, match.index);
        results.push({
          id: rule.id,
          category: 'custom',
          name: rule.name,
          status: 'fail',
          severity: rule.severity,
          filePath: rule.file,
          line: loc.line,
          column: loc.column,
          message:
            rule.message ||
            `Custom rule "${rule.name}" failed: forbidden pattern "/${rule.forbiddenPattern}/" matched on line ${loc.line}.`,
          remediation: `Remove or replace the forbidden pattern in "${rule.file}".`,
        });
        continue;
      }
    }

    results.push({
      id: rule.id,
      category: 'custom',
      name: rule.name,
      status: 'pass',
      severity: 'info',
      filePath: rule.file,
      message: `Custom rule "${rule.name}" passed.`,
    });
  }

  return results;
}
