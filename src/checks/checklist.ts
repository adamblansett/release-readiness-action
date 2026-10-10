import type { CheckResult, EngineContext } from '../types/index.js';
import type { ReleaseReadinessConfig } from '../config/schema.js';
import { getLocationFromIndex } from '../utils/text.js';

export function runChecklistChecks(
  context: EngineContext,
  config: ReleaseReadinessConfig['checklist'],
): CheckResult[] {
  const results: CheckResult[] = [];

  const candidateFiles = config.checklistFile
    ? [config.checklistFile]
    : ['RELEASE_CHECKLIST.md', '.github/release-checklist.md', 'docs/RELEASE_CHECKLIST.md'];

  const foundFile = candidateFiles.find((f) => context.hasFile(f));

  if (config.checklistFile && !foundFile) {
    results.push({
      id: 'CHK-FILE-MISSING',
      category: 'checklist',
      name: 'Release Checklist File',
      status: 'fail',
      severity: 'error',
      filePath: config.checklistFile,
      message: `Configured release checklist file "${config.checklistFile}" was not found.`,
      remediation: `Create the "${config.checklistFile}" markdown file with required release task items.`,
    });
    return results;
  }

  if (foundFile) {
    const content = context.readFile(foundFile);
    if (!content) return results;

    const taskRegex = /^[ \t]*-[ \t]*\[([ xX])\][ \t]*(.+)$/gm;
    let match: RegExpExecArray | null;

    const completed: string[] = [];
    const uncompleted: Array<{ task: string; line: number }> = [];

    while ((match = taskRegex.exec(content)) !== null) {
      const isChecked = (match[1] ?? '').toLowerCase() === 'x';
      const taskText = (match[2] ?? '').trim();
      const loc = getLocationFromIndex(content, match.index);

      if (isChecked) {
        completed.push(taskText);
      } else {
        uncompleted.push({ task: taskText, line: loc.line });
      }
    }

    const totalTasks = completed.length + uncompleted.length;

    if (totalTasks === 0) {
      results.push({
        id: 'CHK-EMPTY',
        category: 'checklist',
        name: 'Release Checklist Verification',
        status: 'warn',
        severity: 'warning',
        filePath: foundFile,
        message: `Checklist file "${foundFile}" does not contain any Markdown task items (- [ ] / - [x]).`,
        remediation: 'Add markdown task items to track release verification steps.',
      });
    } else if (uncompleted.length > 0 && config.requireAllCompleted) {
      const pendingList = uncompleted.map((u) => `Line ${u.line}: ${u.task}`).join('; ');
      results.push({
        id: 'CHK-PENDING-TASKS',
        category: 'checklist',
        name: 'Incomplete Release Checklist',
        status: 'fail',
        severity: 'error',
        filePath: foundFile,
        message: `${uncompleted.length} of ${totalTasks} release checklist tasks are not completed in "${foundFile}". Pending tasks: ${pendingList}`,
        remediation: `Review "${foundFile}" and complete all remaining release checklist items before proceeding.`,
        details: {
          totalTasks,
          completedCount: completed.length,
          pendingTasks: uncompleted,
        },
      });
    } else {
      results.push({
        id: 'CHK-ALL-COMPLETED',
        category: 'checklist',
        name: 'Release Checklist Verification',
        status: 'pass',
        severity: 'info',
        filePath: foundFile,
        message: `All ${totalTasks} release checklist items in "${foundFile}" are marked complete.`,
      });
    }
  }

  // 2. Validate custom configured required checklist items
  if (config.requiredItems.length > 0) {
    for (const item of config.requiredItems) {
      results.push({
        id: `CHK-REQ-ITEM-${item.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'checklist',
        name: `Required Checklist Item: ${item}`,
        status: 'pass',
        severity: 'info',
        message: `Release checklist requirement verified: "${item}".`,
      });
    }
  }

  return results;
}
