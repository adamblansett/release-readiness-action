import { z } from 'zod';

export const CustomRuleSchema = z.object({
  id: z.string().min(1, 'Rule ID is required'),
  name: z.string().min(1, 'Rule name is required'),
  file: z.string().min(1, 'Target file is required'),
  mustExist: z.boolean().optional(),
  pattern: z.string().optional(),
  forbiddenPattern: z.string().optional(),
  message: z.string().optional(),
  severity: z.enum(['error', 'warning', 'info']).default('error'),
});

export const ScriptCommandSchema = z.object({
  name: z.string().min(1, 'Command name is required'),
  command: z.string().min(1, 'Command executable is required'),
  args: z.array(z.string()).default([]),
  timeoutMs: z.number().int().positive().default(60000),
  required: z.boolean().default(true),
});

export const RequiredDocSchema = z.object({
  path: z.string().min(1, 'Document path is required'),
  minSize: z.number().int().nonnegative().optional(),
  title: z.string().optional(),
});

export const SecretPatternSchema = z.object({
  name: z.string().min(1, 'Secret pattern name is required'),
  pattern: z.string().min(1, 'Regex pattern is required'),
});

export const ReleaseReadinessConfigSchema = z
  .object({
    workingDirectory: z.string().default('.'),
    failOn: z.enum(['error', 'warning', 'never']).default('error'),
    failOnSecrets: z.boolean().default(true),

    structure: z
      .object({
        checkReadme: z.boolean().default(true),
        checkLicense: z.boolean().default(true),
        checkChangelog: z.boolean().default(false),
        checkSecurityPolicy: z.boolean().default(false),
        checkContributing: z.boolean().default(false),
        checkCodeowners: z.boolean().default(false),
        checkCiWorkflow: z.boolean().default(true),
        checkReleaseNotes: z.boolean().default(false),
        requiredFiles: z.array(z.string()).default([]),
        requiredDirectories: z.array(z.string()).default([]),
      })
      .default({}),

    documentation: z
      .object({
        minFileSizeBytes: z.number().int().nonnegative().default(20),
        disallowPlaceholders: z.boolean().default(true),
        placeholderPatterns: z
          .array(z.string())
          .default([
            'TODO',
            'FIXME',
            'LOREM IPSUM',
            '[PROJECT NAME]',
            '<INSERT',
            'CHANGEME',
            'REPLACE_ME',
            'COMING SOON',
          ]),
        requiredDocs: z.array(RequiredDocSchema).default([]),
      })
      .default({}),

    packageMetadata: z
      .object({
        enabled: z.boolean().default(true),
        requireName: z.boolean().default(true),
        requireVersion: z.boolean().default(true),
        requireDescription: z.boolean().default(false),
        requireLicense: z.boolean().default(true),
        requireRepository: z.boolean().default(false),
        validateSemver: z.boolean().default(true),
        validateEntryPoints: z.boolean().default(true),
        validateFilesWhitelist: z.boolean().default(true),
        checkTagVersionMatch: z.boolean().default(false),
      })
      .default({}),

    scripts: z
      .object({
        execute: z.boolean().default(false),
        requiredScripts: z.array(z.string()).default([]),
        commands: z.array(ScriptCommandSchema).default([]),
        timeoutMs: z.number().int().positive().default(60000),
        maxOutputBytes: z.number().int().positive().default(1048576), // 1MB
      })
      .default({}),

    secrets: z
      .object({
        enabled: z.boolean().default(true),
        maxFileSizeKb: z.number().int().positive().default(512),
        excludePaths: z
          .array(z.string())
          .default([
            'node_modules/**',
            'dist/**',
            'build/**',
            '.git/**',
            'coverage/**',
            '*.lock',
            'package-lock.json',
            '*.png',
            '*.jpg',
            '*.jpeg',
            '*.gif',
            '*.svg',
            '*.ico',
            '*.pdf',
            '*.woff',
            '*.woff2',
            '*.ttf',
            '*.eot',
            '*.mp3',
            '*.mp4',
          ]),
        includeUntracked: z.boolean().default(true),
        additionalPatterns: z.array(SecretPatternSchema).default([]),
      })
      .default({}),

    dependencies: z
      .object({
        checkLockfile: z.boolean().default(true),
        checkMultipleLockfiles: z.boolean().default(true),
        audit: z.boolean().default(false),
        auditLevel: z.enum(['critical', 'high', 'moderate', 'low']).default('high'),
      })
      .default({}),

    git: z
      .object({
        checkUncommitted: z.boolean().default(false),
        checkBranch: z.boolean().default(false),
        allowedBranches: z.array(z.string()).default(['main', 'master', 'release/*']),
      })
      .default({}),

    checklist: z
      .object({
        checklistFile: z.string().optional(),
        requireAllCompleted: z.boolean().default(true),
        requiredItems: z.array(z.string()).default([]),
      })
      .default({}),

    reporting: z
      .object({
        format: z.enum(['all', 'summary', 'markdown', 'json', 'console']).default('all'),
        summaryFile: z.string().optional(),
        jsonOutputFile: z.string().optional(),
        annotateGitHub: z.boolean().default(true),
        createSummary: z.boolean().default(true),
      })
      .default({}),

    customRules: z.array(CustomRuleSchema).default([]),
  })
  .strict(); // Strict mode ensures unknown configuration options fail safely and are not ignored

export type ReleaseReadinessConfig = z.infer<typeof ReleaseReadinessConfigSchema>;
export type RawReleaseReadinessConfig = z.input<typeof ReleaseReadinessConfigSchema>;
