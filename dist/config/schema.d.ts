import { z } from 'zod';
export declare const CustomRuleSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    file: z.ZodString;
    mustExist: z.ZodOptional<z.ZodBoolean>;
    pattern: z.ZodOptional<z.ZodString>;
    forbiddenPattern: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
    severity: z.ZodDefault<z.ZodEnum<["error", "warning", "info"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    file: string;
    severity: "error" | "warning" | "info";
    mustExist?: boolean | undefined;
    pattern?: string | undefined;
    forbiddenPattern?: string | undefined;
    message?: string | undefined;
}, {
    id: string;
    name: string;
    file: string;
    mustExist?: boolean | undefined;
    pattern?: string | undefined;
    forbiddenPattern?: string | undefined;
    message?: string | undefined;
    severity?: "error" | "warning" | "info" | undefined;
}>;
export declare const ScriptCommandSchema: z.ZodObject<{
    name: z.ZodString;
    command: z.ZodString;
    args: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    required: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    command: string;
    args: string[];
    timeoutMs: number;
    required: boolean;
}, {
    name: string;
    command: string;
    args?: string[] | undefined;
    timeoutMs?: number | undefined;
    required?: boolean | undefined;
}>;
export declare const RequiredDocSchema: z.ZodObject<{
    path: z.ZodString;
    minSize: z.ZodOptional<z.ZodNumber>;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    minSize?: number | undefined;
    title?: string | undefined;
}, {
    path: string;
    minSize?: number | undefined;
    title?: string | undefined;
}>;
export declare const SecretPatternSchema: z.ZodObject<{
    name: z.ZodString;
    pattern: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    pattern: string;
}, {
    name: string;
    pattern: string;
}>;
export declare const ReleaseReadinessConfigSchema: z.ZodObject<{
    workingDirectory: z.ZodDefault<z.ZodString>;
    failOn: z.ZodDefault<z.ZodEnum<["error", "warning", "never"]>>;
    failOnSecrets: z.ZodDefault<z.ZodBoolean>;
    structure: z.ZodDefault<z.ZodObject<{
        checkReadme: z.ZodDefault<z.ZodBoolean>;
        checkLicense: z.ZodDefault<z.ZodBoolean>;
        checkChangelog: z.ZodDefault<z.ZodBoolean>;
        checkSecurityPolicy: z.ZodDefault<z.ZodBoolean>;
        checkContributing: z.ZodDefault<z.ZodBoolean>;
        checkCodeowners: z.ZodDefault<z.ZodBoolean>;
        checkCiWorkflow: z.ZodDefault<z.ZodBoolean>;
        checkReleaseNotes: z.ZodDefault<z.ZodBoolean>;
        requiredFiles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        requiredDirectories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        checkReadme: boolean;
        checkLicense: boolean;
        checkChangelog: boolean;
        checkSecurityPolicy: boolean;
        checkContributing: boolean;
        checkCodeowners: boolean;
        checkCiWorkflow: boolean;
        checkReleaseNotes: boolean;
        requiredFiles: string[];
        requiredDirectories: string[];
    }, {
        checkReadme?: boolean | undefined;
        checkLicense?: boolean | undefined;
        checkChangelog?: boolean | undefined;
        checkSecurityPolicy?: boolean | undefined;
        checkContributing?: boolean | undefined;
        checkCodeowners?: boolean | undefined;
        checkCiWorkflow?: boolean | undefined;
        checkReleaseNotes?: boolean | undefined;
        requiredFiles?: string[] | undefined;
        requiredDirectories?: string[] | undefined;
    }>>;
    documentation: z.ZodDefault<z.ZodObject<{
        minFileSizeBytes: z.ZodDefault<z.ZodNumber>;
        disallowPlaceholders: z.ZodDefault<z.ZodBoolean>;
        placeholderPatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        requiredDocs: z.ZodDefault<z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            minSize: z.ZodOptional<z.ZodNumber>;
            title: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            minSize?: number | undefined;
            title?: string | undefined;
        }, {
            path: string;
            minSize?: number | undefined;
            title?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        minFileSizeBytes: number;
        disallowPlaceholders: boolean;
        placeholderPatterns: string[];
        requiredDocs: {
            path: string;
            minSize?: number | undefined;
            title?: string | undefined;
        }[];
    }, {
        minFileSizeBytes?: number | undefined;
        disallowPlaceholders?: boolean | undefined;
        placeholderPatterns?: string[] | undefined;
        requiredDocs?: {
            path: string;
            minSize?: number | undefined;
            title?: string | undefined;
        }[] | undefined;
    }>>;
    packageMetadata: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        requireName: z.ZodDefault<z.ZodBoolean>;
        requireVersion: z.ZodDefault<z.ZodBoolean>;
        requireDescription: z.ZodDefault<z.ZodBoolean>;
        requireLicense: z.ZodDefault<z.ZodBoolean>;
        requireRepository: z.ZodDefault<z.ZodBoolean>;
        validateSemver: z.ZodDefault<z.ZodBoolean>;
        validateEntryPoints: z.ZodDefault<z.ZodBoolean>;
        validateFilesWhitelist: z.ZodDefault<z.ZodBoolean>;
        checkTagVersionMatch: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        requireName: boolean;
        requireVersion: boolean;
        requireDescription: boolean;
        requireLicense: boolean;
        requireRepository: boolean;
        validateSemver: boolean;
        validateEntryPoints: boolean;
        validateFilesWhitelist: boolean;
        checkTagVersionMatch: boolean;
    }, {
        enabled?: boolean | undefined;
        requireName?: boolean | undefined;
        requireVersion?: boolean | undefined;
        requireDescription?: boolean | undefined;
        requireLicense?: boolean | undefined;
        requireRepository?: boolean | undefined;
        validateSemver?: boolean | undefined;
        validateEntryPoints?: boolean | undefined;
        validateFilesWhitelist?: boolean | undefined;
        checkTagVersionMatch?: boolean | undefined;
    }>>;
    scripts: z.ZodDefault<z.ZodObject<{
        execute: z.ZodDefault<z.ZodBoolean>;
        requiredScripts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        commands: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            command: z.ZodString;
            args: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            timeoutMs: z.ZodDefault<z.ZodNumber>;
            required: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            command: string;
            args: string[];
            timeoutMs: number;
            required: boolean;
        }, {
            name: string;
            command: string;
            args?: string[] | undefined;
            timeoutMs?: number | undefined;
            required?: boolean | undefined;
        }>, "many">>;
        timeoutMs: z.ZodDefault<z.ZodNumber>;
        maxOutputBytes: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        timeoutMs: number;
        execute: boolean;
        requiredScripts: string[];
        commands: {
            name: string;
            command: string;
            args: string[];
            timeoutMs: number;
            required: boolean;
        }[];
        maxOutputBytes: number;
    }, {
        timeoutMs?: number | undefined;
        execute?: boolean | undefined;
        requiredScripts?: string[] | undefined;
        commands?: {
            name: string;
            command: string;
            args?: string[] | undefined;
            timeoutMs?: number | undefined;
            required?: boolean | undefined;
        }[] | undefined;
        maxOutputBytes?: number | undefined;
    }>>;
    secrets: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        maxFileSizeKb: z.ZodDefault<z.ZodNumber>;
        excludePaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        includeUntracked: z.ZodDefault<z.ZodBoolean>;
        additionalPatterns: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            pattern: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            pattern: string;
        }, {
            name: string;
            pattern: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        maxFileSizeKb: number;
        excludePaths: string[];
        includeUntracked: boolean;
        additionalPatterns: {
            name: string;
            pattern: string;
        }[];
    }, {
        enabled?: boolean | undefined;
        maxFileSizeKb?: number | undefined;
        excludePaths?: string[] | undefined;
        includeUntracked?: boolean | undefined;
        additionalPatterns?: {
            name: string;
            pattern: string;
        }[] | undefined;
    }>>;
    dependencies: z.ZodDefault<z.ZodObject<{
        checkLockfile: z.ZodDefault<z.ZodBoolean>;
        checkMultipleLockfiles: z.ZodDefault<z.ZodBoolean>;
        audit: z.ZodDefault<z.ZodBoolean>;
        auditLevel: z.ZodDefault<z.ZodEnum<["critical", "high", "moderate", "low"]>>;
    }, "strip", z.ZodTypeAny, {
        checkLockfile: boolean;
        checkMultipleLockfiles: boolean;
        audit: boolean;
        auditLevel: "critical" | "high" | "moderate" | "low";
    }, {
        checkLockfile?: boolean | undefined;
        checkMultipleLockfiles?: boolean | undefined;
        audit?: boolean | undefined;
        auditLevel?: "critical" | "high" | "moderate" | "low" | undefined;
    }>>;
    git: z.ZodDefault<z.ZodObject<{
        checkUncommitted: z.ZodDefault<z.ZodBoolean>;
        checkBranch: z.ZodDefault<z.ZodBoolean>;
        allowedBranches: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        checkUncommitted: boolean;
        checkBranch: boolean;
        allowedBranches: string[];
    }, {
        checkUncommitted?: boolean | undefined;
        checkBranch?: boolean | undefined;
        allowedBranches?: string[] | undefined;
    }>>;
    checklist: z.ZodDefault<z.ZodObject<{
        checklistFile: z.ZodOptional<z.ZodString>;
        requireAllCompleted: z.ZodDefault<z.ZodBoolean>;
        requiredItems: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        requireAllCompleted: boolean;
        requiredItems: string[];
        checklistFile?: string | undefined;
    }, {
        checklistFile?: string | undefined;
        requireAllCompleted?: boolean | undefined;
        requiredItems?: string[] | undefined;
    }>>;
    reporting: z.ZodDefault<z.ZodObject<{
        format: z.ZodDefault<z.ZodEnum<["all", "summary", "markdown", "json", "console"]>>;
        summaryFile: z.ZodOptional<z.ZodString>;
        jsonOutputFile: z.ZodOptional<z.ZodString>;
        annotateGitHub: z.ZodDefault<z.ZodBoolean>;
        createSummary: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        format: "all" | "summary" | "markdown" | "json" | "console";
        annotateGitHub: boolean;
        createSummary: boolean;
        summaryFile?: string | undefined;
        jsonOutputFile?: string | undefined;
    }, {
        format?: "all" | "summary" | "markdown" | "json" | "console" | undefined;
        summaryFile?: string | undefined;
        jsonOutputFile?: string | undefined;
        annotateGitHub?: boolean | undefined;
        createSummary?: boolean | undefined;
    }>>;
    customRules: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        file: z.ZodString;
        mustExist: z.ZodOptional<z.ZodBoolean>;
        pattern: z.ZodOptional<z.ZodString>;
        forbiddenPattern: z.ZodOptional<z.ZodString>;
        message: z.ZodOptional<z.ZodString>;
        severity: z.ZodDefault<z.ZodEnum<["error", "warning", "info"]>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        file: string;
        severity: "error" | "warning" | "info";
        mustExist?: boolean | undefined;
        pattern?: string | undefined;
        forbiddenPattern?: string | undefined;
        message?: string | undefined;
    }, {
        id: string;
        name: string;
        file: string;
        mustExist?: boolean | undefined;
        pattern?: string | undefined;
        forbiddenPattern?: string | undefined;
        message?: string | undefined;
        severity?: "error" | "warning" | "info" | undefined;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    structure: {
        checkReadme: boolean;
        checkLicense: boolean;
        checkChangelog: boolean;
        checkSecurityPolicy: boolean;
        checkContributing: boolean;
        checkCodeowners: boolean;
        checkCiWorkflow: boolean;
        checkReleaseNotes: boolean;
        requiredFiles: string[];
        requiredDirectories: string[];
    };
    documentation: {
        minFileSizeBytes: number;
        disallowPlaceholders: boolean;
        placeholderPatterns: string[];
        requiredDocs: {
            path: string;
            minSize?: number | undefined;
            title?: string | undefined;
        }[];
    };
    scripts: {
        timeoutMs: number;
        execute: boolean;
        requiredScripts: string[];
        commands: {
            name: string;
            command: string;
            args: string[];
            timeoutMs: number;
            required: boolean;
        }[];
        maxOutputBytes: number;
    };
    secrets: {
        enabled: boolean;
        maxFileSizeKb: number;
        excludePaths: string[];
        includeUntracked: boolean;
        additionalPatterns: {
            name: string;
            pattern: string;
        }[];
    };
    dependencies: {
        checkLockfile: boolean;
        checkMultipleLockfiles: boolean;
        audit: boolean;
        auditLevel: "critical" | "high" | "moderate" | "low";
    };
    git: {
        checkUncommitted: boolean;
        checkBranch: boolean;
        allowedBranches: string[];
    };
    checklist: {
        requireAllCompleted: boolean;
        requiredItems: string[];
        checklistFile?: string | undefined;
    };
    workingDirectory: string;
    failOn: "error" | "warning" | "never";
    failOnSecrets: boolean;
    packageMetadata: {
        enabled: boolean;
        requireName: boolean;
        requireVersion: boolean;
        requireDescription: boolean;
        requireLicense: boolean;
        requireRepository: boolean;
        validateSemver: boolean;
        validateEntryPoints: boolean;
        validateFilesWhitelist: boolean;
        checkTagVersionMatch: boolean;
    };
    reporting: {
        format: "all" | "summary" | "markdown" | "json" | "console";
        annotateGitHub: boolean;
        createSummary: boolean;
        summaryFile?: string | undefined;
        jsonOutputFile?: string | undefined;
    };
    customRules: {
        id: string;
        name: string;
        file: string;
        severity: "error" | "warning" | "info";
        mustExist?: boolean | undefined;
        pattern?: string | undefined;
        forbiddenPattern?: string | undefined;
        message?: string | undefined;
    }[];
}, {
    structure?: {
        checkReadme?: boolean | undefined;
        checkLicense?: boolean | undefined;
        checkChangelog?: boolean | undefined;
        checkSecurityPolicy?: boolean | undefined;
        checkContributing?: boolean | undefined;
        checkCodeowners?: boolean | undefined;
        checkCiWorkflow?: boolean | undefined;
        checkReleaseNotes?: boolean | undefined;
        requiredFiles?: string[] | undefined;
        requiredDirectories?: string[] | undefined;
    } | undefined;
    documentation?: {
        minFileSizeBytes?: number | undefined;
        disallowPlaceholders?: boolean | undefined;
        placeholderPatterns?: string[] | undefined;
        requiredDocs?: {
            path: string;
            minSize?: number | undefined;
            title?: string | undefined;
        }[] | undefined;
    } | undefined;
    scripts?: {
        timeoutMs?: number | undefined;
        execute?: boolean | undefined;
        requiredScripts?: string[] | undefined;
        commands?: {
            name: string;
            command: string;
            args?: string[] | undefined;
            timeoutMs?: number | undefined;
            required?: boolean | undefined;
        }[] | undefined;
        maxOutputBytes?: number | undefined;
    } | undefined;
    secrets?: {
        enabled?: boolean | undefined;
        maxFileSizeKb?: number | undefined;
        excludePaths?: string[] | undefined;
        includeUntracked?: boolean | undefined;
        additionalPatterns?: {
            name: string;
            pattern: string;
        }[] | undefined;
    } | undefined;
    dependencies?: {
        checkLockfile?: boolean | undefined;
        checkMultipleLockfiles?: boolean | undefined;
        audit?: boolean | undefined;
        auditLevel?: "critical" | "high" | "moderate" | "low" | undefined;
    } | undefined;
    git?: {
        checkUncommitted?: boolean | undefined;
        checkBranch?: boolean | undefined;
        allowedBranches?: string[] | undefined;
    } | undefined;
    checklist?: {
        checklistFile?: string | undefined;
        requireAllCompleted?: boolean | undefined;
        requiredItems?: string[] | undefined;
    } | undefined;
    workingDirectory?: string | undefined;
    failOn?: "error" | "warning" | "never" | undefined;
    failOnSecrets?: boolean | undefined;
    packageMetadata?: {
        enabled?: boolean | undefined;
        requireName?: boolean | undefined;
        requireVersion?: boolean | undefined;
        requireDescription?: boolean | undefined;
        requireLicense?: boolean | undefined;
        requireRepository?: boolean | undefined;
        validateSemver?: boolean | undefined;
        validateEntryPoints?: boolean | undefined;
        validateFilesWhitelist?: boolean | undefined;
        checkTagVersionMatch?: boolean | undefined;
    } | undefined;
    reporting?: {
        format?: "all" | "summary" | "markdown" | "json" | "console" | undefined;
        summaryFile?: string | undefined;
        jsonOutputFile?: string | undefined;
        annotateGitHub?: boolean | undefined;
        createSummary?: boolean | undefined;
    } | undefined;
    customRules?: {
        id: string;
        name: string;
        file: string;
        mustExist?: boolean | undefined;
        pattern?: string | undefined;
        forbiddenPattern?: string | undefined;
        message?: string | undefined;
        severity?: "error" | "warning" | "info" | undefined;
    }[] | undefined;
}>;
export type ReleaseReadinessConfig = z.infer<typeof ReleaseReadinessConfigSchema>;
export type RawReleaseReadinessConfig = z.input<typeof ReleaseReadinessConfigSchema>;
//# sourceMappingURL=schema.d.ts.map