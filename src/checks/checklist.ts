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

  const completed: string[] = [];
  const uncompleted: Array<{ task: string; line: number }> = [];

  if (foundFile) {
    const content = context.readFile(foundFile);
    if (content !== null) {
      const taskRegex = /^[ \t]*-[ \t]*\[([ xX])\][ \t]*(.+)$/gm;
      let match: RegExpExecArray | null;

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
  }

  // 2. Validate configured required checklist items against parsed tasks
  if (config.requiredItems.length > 0) {
    for (const item of config.requiredItems) {
      const id = `CHK-REQ-ITEM-${item.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const name = `Required Checklist Item: ${item}`;

      if (!foundFile) {
        results.push({
          id,
          category: 'checklist',
          name,
          status: 'fail',
          severity: 'error',
          message: `Required checklist item "${item}" could not be verified because no release checklist file was found.`,
          remediation: `Create a RELEASE_CHECKLIST.md file containing a completed task item for "${item}".`,
        });
        continue;
      }

      const normalizedItem = item.toLowerCase();
      const isCompleted = completed.some((t) => t.toLowerCase().includes(normalizedItem));
      if (isCompleted) {
        results.push({
          id,
          category: 'checklist',
          name,
          status: 'pass',
          severity: 'info',
          filePath: foundFile,
          message: `Required release checklist item "${item}" is marked complete in "${foundFile}".`,
        });
        continue;
      }

      const matchedUncompleted = uncompleted.find((u) =>
        u.task.toLowerCase().includes(normalizedItem),
      );
      if (matchedUncompleted) {
        results.push({
          id,
          category: 'checklist',
          name,
          status: 'fail',
          severity: 'error',
          filePath: foundFile,
          line: matchedUncompleted.line,
          message: `Required checklist item "${item}" is present on line ${matchedUncompleted.line} of "${foundFile}" but is not marked complete.`,
          remediation: `Complete the "${item}" item (- [x]) in "${foundFile}".`,
        });
        continue;
      }

      results.push({
        id,
        category: 'checklist',
        name,
        status: 'fail',
        severity: 'error',
        filePath: foundFile,
        message: `Required checklist item "${item}" was not found in "${foundFile}".`,
        remediation: `Add and complete a task item matching "${item}" in "${foundFile}".`,
      });
    }
  }

  return results;
}
