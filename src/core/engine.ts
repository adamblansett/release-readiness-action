import type {
  CheckResult,
  Category,
  CategorySummary,
  ReadinessReport,
  ReadinessSummary,
} from '../types/index.js';
import type { ReleaseReadinessConfig } from '../config/schema.js';
import { FileCollector } from '../scanners/file-collector.js';
import { SecretScanner } from '../scanners/secret-scanner.js';
import { runStructureChecks } from '../checks/structure.js';
import { runDocumentationChecks } from '../checks/documentation.js';
import { runPackageChecks } from '../checks/package.js';
import { runScriptChecks } from '../checks/scripts.js';
import { runDependencyChecks } from '../checks/dependencies.js';
import { runGitChecks } from '../checks/git.js';
import { runChecklistChecks } from '../checks/checklist.js';
import { runCustomRules } from '../checks/custom.js';

export interface EngineRunOptions {
  config: ReleaseReadinessConfig;
  customContext?: ReturnType<FileCollector['createContext']>;
}

export class ReleaseReadinessEngine {
  private readonly config: ReleaseReadinessConfig;

  constructor(config: ReleaseReadinessConfig) {
    this.config = config;
  }

  public async evaluate(options?: {
    customContext?: ReturnType<FileCollector['createContext']>;
  }): Promise<ReadinessReport> {
    const startTime = Date.now();

    // 1. Setup file collector and engine context
    const collector = new FileCollector({
      workingDirectory: this.config.workingDirectory,
      excludePatterns: this.config.secrets.excludePaths,
      maxFileSizeKb: this.config.secrets.maxFileSizeKb,
    });

    const context = options?.customContext || collector.createContext();

    // 2. Execute all check modules
    const allResults: CheckResult[] = [];

    // Structure checks
    allResults.push(...runStructureChecks(context, this.config.structure));

    // Documentation checks
    allResults.push(...runDocumentationChecks(context, this.config.documentation));

    // Package metadata checks
    const pkgResults = await runPackageChecks(context, this.config.packageMetadata);
    allResults.push(...pkgResults);

    // Script & build checks
    const scriptResults = await runScriptChecks(context, this.config.scripts);
    allResults.push(...scriptResults);

    // Secret scanner
    const secretScanner = new SecretScanner(this.config.secrets);
    allResults.push(...secretScanner.scan(context));

    // Dependency checks
    const depResults = await runDependencyChecks(context, this.config.dependencies);
    allResults.push(...depResults);

    // Git checks
    const gitResults = await runGitChecks(context, this.config.git);
    allResults.push(...gitResults);

    // Release checklist checks
    allResults.push(...runChecklistChecks(context, this.config.checklist));

    // Custom rules
    allResults.push(...runCustomRules(context, this.config.customRules));

    // 3. Compute summaries and determine pass/fail
    const durationMs = Date.now() - startTime;

    const initialCategorySummary = (): CategorySummary => ({
      total: 0,
      passed: 0,
      warnings: 0,
      errors: 0,
      skipped: 0,
    });

    const categories: Record<Category, CategorySummary> = {
      structure: initialCategorySummary(),
      documentation: initialCategorySummary(),
      package: initialCategorySummary(),
      scripts: initialCategorySummary(),
      secrets: initialCategorySummary(),
      dependencies: initialCategorySummary(),
      git: initialCategorySummary(),
      checklist: initialCategorySummary(),
      custom: initialCategorySummary(),
    };

    let totalPassed = 0;
    let totalWarnings = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    let hasExposedSecrets = false;

    for (const res of allResults) {
      const cat = categories[res.category];
      cat.total++;

      if (res.status === 'pass') {
        cat.passed++;
        totalPassed++;
      } else if (res.status === 'skip') {
        cat.skipped++;
        totalSkipped++;
      } else if (res.status === 'warn') {
        cat.warnings++;
        totalWarnings++;
      } else if (res.status === 'fail') {
        if (res.severity === 'warning') {
          cat.warnings++;
          totalWarnings++;
        } else {
          cat.errors++;
          totalErrors++;
        }

        if (res.category === 'secrets') {
          hasExposedSecrets = true;
        }
      }
    }

    // Determine pass status
    let passed = true;

    if (this.config.failOnSecrets && hasExposedSecrets) {
      passed = false;
    } else if (this.config.failOn === 'error') {
      passed = totalErrors === 0;
    } else if (this.config.failOn === 'warning') {
      passed = totalErrors === 0 && totalWarnings === 0;
    } else if (this.config.failOn === 'never') {
      passed = !this.config.failOnSecrets || !hasExposedSecrets;
    }

    const summary: ReadinessSummary = {
      totalChecks: allResults.length,
      passed: totalPassed,
      warnings: totalWarnings,
      errors: totalErrors,
      skipped: totalSkipped,
      durationMs,
    };

    return {
      timestamp: new Date().toISOString(),
      workingDirectory: this.config.workingDirectory,
      passed,
      failThreshold: this.config.failOn,
      summary,
      categories,
      results: allResults,
    };
  }
}
