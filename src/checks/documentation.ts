import type { CheckResult, EngineContext } from '../types/index.js';
import type { ReleaseReadinessConfig } from '../config/schema.js';
import { getLocationFromIndex } from '../utils/text.js';

export function runDocumentationChecks(
  context: EngineContext,
  config: ReleaseReadinessConfig['documentation'],
): CheckResult[] {
  const results: CheckResult[] = [];

  // Identify documentation files present in the repo
  const docCandidates = [
    'README.md',
    'README',
    'LICENSE',
    'LICENSE.md',
    'CHANGELOG.md',
    'SECURITY.md',
    'CONTRIBUTING.md',
    'RELEASE_NOTES.md',
    'RELEASE_CHECKLIST.md',
  ];

  const filesToCheck = new Set<string>();

  for (const candidate of docCandidates) {
    if (context.hasFile(candidate)) {
      filesToCheck.add(candidate);
    }
  }

  // Include user-defined required docs
  for (const reqDoc of config.requiredDocs) {
    filesToCheck.add(reqDoc.path);
  }

  for (const filePath of filesToCheck) {
    const exists = context.hasFile(filePath);
    if (!exists) {
      // Required doc missing
      results.push({
        id: `DOC-REQ-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'documentation',
        name: `Required Documentation: ${filePath}`,
        status: 'fail',
        severity: 'error',
        filePath,
        message: `Configured documentation file "${filePath}" does not exist.`,
        remediation: `Create the "${filePath}" documentation file.`,
      });
      continue;
    }

    const content = context.readFile(filePath);
    const size = context.getFileSize(filePath) ?? 0;

    // 1. Empty / Trivial content check
    const minSize = config.minFileSizeBytes;
    if (!content || content.trim().length === 0 || size < minSize) {
      results.push({
        id: `DOC-EMPTY-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'documentation',
        name: `Empty or Incomplete Documentation: ${filePath}`,
        status: 'fail',
        severity: 'error',
        filePath,
        line: 1,
        column: 1,
        message: `Documentation file "${filePath}" is empty or trivial (${size} bytes, minimum required is ${minSize} bytes).`,
        remediation: `Add meaningful content to "${filePath}". Ensure it contains accurate guidance for the release.`,
      });
      continue;
    }

    // 2. Placeholder check (e.g. TODO, [PROJECT NAME], Lorem ipsum)
    if (config.disallowPlaceholders && config.placeholderPatterns.length > 0) {
      // Strip fenced code blocks and inline code from markdown before checking for prose placeholders
      const textToScan = filePath.endsWith('.md')
        ? content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '')
        : content;

      let foundPlaceholder = false;
      for (const pattern of config.placeholderPatterns) {
        const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        const match = regex.exec(textToScan);
        if (match) {
          const loc = getLocationFromIndex(content, match.index);
          results.push({
            id: `DOC-PLACEHOLDER-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
            category: 'documentation',
            name: `Unresolved Placeholder in ${filePath}`,
            status: 'warn',
            severity: 'warning',
            filePath,
            line: loc.line,
            column: loc.column,
            message: `Unresolved placeholder "${match[0]}" found in "${filePath}" on line ${loc.line}: "${loc.lineSnippet}".`,
            remediation: `Review "${filePath}" and replace template placeholders with actual release documentation.`,
          });
          foundPlaceholder = true;
          break; // Report the first placeholder finding per file to avoid noise
        }
      }

      if (!foundPlaceholder) {
        results.push({
          id: `DOC-VALID-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
          category: 'documentation',
          name: `Documentation Content: ${filePath}`,
          status: 'pass',
          severity: 'info',
          filePath,
          message: `Documentation file "${filePath}" contains valid non-placeholder content (${size} bytes).`,
        });
      }
    } else {
      results.push({
        id: `DOC-VALID-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'documentation',
        name: `Documentation Content: ${filePath}`,
        status: 'pass',
        severity: 'info',
        filePath,
        message: `Documentation file "${filePath}" is present and non-empty (${size} bytes).`,
      });
    }
  }

  return results;
}
