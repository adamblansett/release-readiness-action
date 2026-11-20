// src/version.ts
var PACKAGE_VERSION = "1.0.3";

// src/config/schema.ts
import { z } from "zod";
var CustomRuleSchema = z.object({
  id: z.string().min(1, "Rule ID is required").max(100),
  name: z.string().min(1, "Rule name is required").max(200),
  file: z.string().min(1, "Target file is required").max(1024),
  mustExist: z.boolean().optional(),
  pattern: z.string().max(4096).optional(),
  forbiddenPattern: z.string().max(4096).optional(),
  message: z.string().max(2048).optional(),
  severity: z.enum(["error", "warning", "info"]).default("error")
});
var ScriptCommandSchema = z.object({
  name: z.string().min(1, "Command name is required").max(100),
  command: z.string().min(1, "Command executable is required").max(512),
  args: z.array(z.string().max(4096)).max(200).default([]),
  timeoutMs: z.number().int().positive().max(36e5).default(6e4),
  required: z.boolean().default(true)
});
var RequiredDocSchema = z.object({
  path: z.string().min(1, "Document path is required").max(1024),
  minSize: z.number().int().nonnegative().optional(),
  title: z.string().max(200).optional()
});
var SecretPatternSchema = z.object({
  name: z.string().min(1, "Secret pattern name is required").max(100),
  pattern: z.string().min(1, "Regex pattern is required").max(4096)
});
var ReleaseReadinessConfigSchema = z.object({
  workingDirectory: z.string().default("."),
  failOn: z.enum(["error", "warning", "never"]).default("error"),
  failOnSecrets: z.boolean().default(true),
  structure: z.object({
    checkReadme: z.boolean().default(true),
    checkLicense: z.boolean().default(true),
    checkChangelog: z.boolean().default(false),
    checkSecurityPolicy: z.boolean().default(false),
    checkContributing: z.boolean().default(false),
    checkCodeowners: z.boolean().default(false),
    checkCiWorkflow: z.boolean().default(true),
    checkReleaseNotes: z.boolean().default(false),
    requiredFiles: z.array(z.string().max(1024)).max(500).default([]),
    requiredDirectories: z.array(z.string().max(1024)).max(500).default([])
  }).default({}),
  documentation: z.object({
    minFileSizeBytes: z.number().int().nonnegative().default(20),
    disallowPlaceholders: z.boolean().default(true),
    placeholderPatterns: z.array(z.string().max(1024)).max(200).default([
      "TODO",
      "FIXME",
      "LOREM IPSUM",
      "[PROJECT NAME]",
      "<INSERT",
      "CHANGEME",
      "REPLACE_ME",
      "COMING SOON"
    ]),
    requiredDocs: z.array(RequiredDocSchema).max(500).default([])
  }).default({}),
  packageMetadata: z.object({
    enabled: z.boolean().default(true),
    requireName: z.boolean().default(true),
    requireVersion: z.boolean().default(true),
    requireDescription: z.boolean().default(false),
    requireLicense: z.boolean().default(true),
    requireRepository: z.boolean().default(false),
    validateSemver: z.boolean().default(true),
    validateEntryPoints: z.boolean().default(true),
    validateFilesWhitelist: z.boolean().default(true),
    checkTagVersionMatch: z.boolean().default(false)
  }).default({}),
  scripts: z.object({
    execute: z.boolean().default(false),
    requiredScripts: z.array(z.string().max(1024)).max(200).default([]),
    commands: z.array(ScriptCommandSchema).max(100).default([]),
    timeoutMs: z.number().int().positive().default(6e4),
    maxOutputBytes: z.number().int().positive().default(1048576)
    // 1MB
  }).default({}),
  secrets: z.object({
    enabled: z.boolean().default(true),
    maxFileSizeKb: z.number().int().positive().default(512),
    excludePaths: z.array(z.string().max(1024)).max(500).default([
      "node_modules/**",
      "dist/**",
      "build/**",
      ".git/**",
      "coverage/**",
      "*.lock",
      "package-lock.json",
      "*.png",
      "*.jpg",
      "*.jpeg",
      "*.gif",
      "*.svg",
      "*.ico",
      "*.pdf",
      "*.woff",
      "*.woff2",
      "*.ttf",
      "*.eot",
      "*.mp3",
      "*.mp4"
    ]),
    includeUntracked: z.boolean().default(true),
    additionalPatterns: z.array(SecretPatternSchema).max(200).default([])
  }).default({}),
  dependencies: z.object({
    checkLockfile: z.boolean().default(true),
    checkMultipleLockfiles: z.boolean().default(true),
    audit: z.boolean().default(false),
    auditLevel: z.enum(["critical", "high", "moderate", "low"]).default("high")
  }).default({}),
  git: z.object({
    checkUncommitted: z.boolean().default(false),
    checkBranch: z.boolean().default(false),
    allowedBranches: z.array(z.string().max(1024)).max(100).default(["main", "master", "release/*"])
  }).default({}),
  checklist: z.object({
    checklistFile: z.string().optional(),
    requireAllCompleted: z.boolean().default(true),
    requiredItems: z.array(z.string().max(1024)).max(500).default([])
  }).default({}),
  reporting: z.object({
    format: z.enum(["all", "summary", "markdown", "json", "console"]).default("all"),
    summaryFile: z.string().optional(),
    jsonOutputFile: z.string().optional(),
    annotateGitHub: z.boolean().default(true),
    createSummary: z.boolean().default(true)
  }).default({}),
  customRules: z.array(CustomRuleSchema).max(500).default([])
}).strict();

// src/config/defaults.ts
var DEFAULT_CONFIG = ReleaseReadinessConfigSchema.parse({});

// src/config/loader.ts
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { ZodError } from "zod";
var CANDIDATE_CONFIG_FILES = [
  ".release-readiness.yml",
  ".release-readiness.yaml",
  ".release-readiness.json",
  "release-readiness.config.json",
  "release-readiness.config.yaml",
  "release-readiness.config.yml"
];
function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const val = override[key];
    if (val === void 0) continue;
    const baseVal = result[key];
    if (val !== null && typeof val === "object" && !Array.isArray(val) && baseVal !== null && typeof baseVal === "object" && !Array.isArray(baseVal)) {
      result[key] = deepMerge(baseVal, val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
function loadConfig(options = {}) {
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd();
  let configFilePath = null;
  let rawFileConfig = {};
  if (options.configPath) {
    const specifiedPath = resolve(cwd, options.configPath);
    if (!existsSync(specifiedPath)) {
      throw new Error(`Config file not found at specified path: ${options.configPath}`);
    }
    configFilePath = specifiedPath;
  } else {
    for (const candidate of CANDIDATE_CONFIG_FILES) {
      const fullPath = join(cwd, candidate);
      if (existsSync(fullPath)) {
        configFilePath = fullPath;
        break;
      }
    }
  }
  if (configFilePath) {
    const content = readFileSync(configFilePath, "utf-8");
    try {
      if (configFilePath.endsWith(".json")) {
        rawFileConfig = JSON.parse(content);
      } else {
        rawFileConfig = parseYaml(content) ?? {};
      }
    } catch (parseError) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(`Failed to parse configuration file "${configFilePath}": ${msg}`);
    }
  }
  const baseConfig = { workingDirectory: cwd, ...rawFileConfig };
  const mergedRaw = options.overrides ? deepMerge(baseConfig, options.overrides) : baseConfig;
  try {
    const validated = ReleaseReadinessConfigSchema.parse(mergedRaw);
    return {
      config: validated,
      configFilePath,
      source: configFilePath ? "file" : "defaults"
    };
  } catch (error2) {
    if (error2 instanceof ZodError) {
      const issues = error2.issues.map((issue) => ` - ${issue.path.join(".")}: ${issue.message}`).join("\n");
      throw new Error(
        `Configuration validation error in ${configFilePath || "options"}:
${issues}`
      );
    }
    throw error2;
  }
}

// src/scanners/file-collector.ts
import { readdirSync, statSync, readFileSync as readFileSync2, realpathSync, existsSync as existsSync2 } from "node:fs";
import { join as join2, extname, relative as relative2, resolve as resolve3 } from "node:path";

// src/utils/path-utils.ts
import { resolve as resolve2, relative, normalize, isAbsolute, sep } from "node:path";
function isPathInside(parentPath, targetPath) {
  const rel = relative(resolve2(parentPath), resolve2(targetPath));
  return rel === "" || rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel);
}
function normalizeRelativePath(p) {
  const normalized = normalize(p).replace(/\\/g, "/");
  return normalized.replace(/^\.\//, "");
}
function matchesPattern(path, pattern) {
  const normalizedPath = normalizeRelativePath(path);
  const normalizedPattern = normalizeRelativePath(pattern);
  if (normalizedPath === normalizedPattern) {
    return true;
  }
  if (normalizedPattern.endsWith("/**")) {
    const dirPrefix = normalizedPattern.slice(0, -3);
    if (normalizedPath === dirPrefix || normalizedPath.startsWith(dirPrefix + "/")) {
      return true;
    }
  }
  if (normalizedPattern.startsWith("*.") || normalizedPattern.startsWith("**/*.")) {
    const ext = normalizedPattern.split(".").pop();
    if (ext && normalizedPath.endsWith("." + ext)) {
      return true;
    }
  }
  if (normalizedPattern === ".git" && (normalizedPath === ".git" || normalizedPath.startsWith(".git/"))) {
    return true;
  }
  if (normalizedPattern.startsWith("*")) {
    const suffix = normalizedPattern.slice(1);
    if (normalizedPath.endsWith(suffix) || normalizedPath.split("/").pop()?.endsWith(suffix)) {
      return true;
    }
  }
  return false;
}

// src/scanners/file-collector.ts
var FileCollector = class {
  workingDirectory;
  excludePatterns;
  maxFileSizeKb;
  constructor(options) {
    this.workingDirectory = resolve3(options.workingDirectory);
    this.excludePatterns = options.excludePatterns || [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".git/**",
      "coverage/**",
      "*.lock",
      "package-lock.json",
      "*.png",
      "*.jpg",
      "*.jpeg",
      "*.gif",
      "*.svg",
      "*.ico",
      "*.pdf",
      "*.woff",
      "*.woff2",
      "*.ttf",
      "*.eot"
    ];
    this.maxFileSizeKb = options.maxFileSizeKb || 512;
  }
  getMaxFileSizeKb() {
    return this.maxFileSizeKb;
  }
  /**
   * Collects all eligible files within the working directory.
   */
  collect() {
    const files = [];
    const visitedRealPaths = /* @__PURE__ */ new Set();
    const walk = (currentDir) => {
      let entries;
      try {
        entries = readdirSync(currentDir);
      } catch {
        return;
      }
      for (const entry of entries) {
        const fullPath = join2(currentDir, entry);
        const relPath = normalizeRelativePath(relative2(this.workingDirectory, fullPath));
        if (this.isExcluded(relPath)) {
          continue;
        }
        let stat;
        let realPath;
        try {
          stat = statSync(fullPath);
          realPath = realpathSync(fullPath);
        } catch {
          continue;
        }
        if (!isPathInside(this.workingDirectory, realPath)) {
          continue;
        }
        if (visitedRealPaths.has(realPath)) {
          continue;
        }
        visitedRealPaths.add(realPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (stat.isFile()) {
          const ext = extname(entry).toLowerCase();
          files.push({
            relativePath: relPath,
            absolutePath: fullPath,
            sizeBytes: stat.size,
            extension: ext
          });
        }
      }
    };
    walk(this.workingDirectory);
    return files;
  }
  isExcluded(relPath) {
    for (const pattern of this.excludePatterns) {
      if (matchesPattern(relPath, pattern)) {
        return true;
      }
    }
    return false;
  }
  /**
   * Creates an EngineContext for checks to safely read files.
   */
  createContext(collectedFiles) {
    const files = collectedFiles || this.collect();
    const fileMap = /* @__PURE__ */ new Map();
    for (const f of files) {
      fileMap.set(normalizeRelativePath(f.relativePath), f);
    }
    return {
      workingDirectory: this.workingDirectory,
      files,
      hasFile: (relPath) => {
        const normalized = normalizeRelativePath(relPath);
        if (fileMap.has(normalized)) return true;
        const abs = resolve3(this.workingDirectory, normalized);
        return isPathInside(this.workingDirectory, abs) && existsSync2(abs);
      },
      readFile: (relPath) => {
        const normalized = normalizeRelativePath(relPath);
        const abs = resolve3(this.workingDirectory, normalized);
        if (!isPathInside(this.workingDirectory, abs) || !existsSync2(abs)) {
          return null;
        }
        try {
          return readFileSync2(abs, "utf-8");
        } catch {
          return null;
        }
      },
      readJson: (relPath) => {
        const normalized = normalizeRelativePath(relPath);
        const abs = resolve3(this.workingDirectory, normalized);
        if (!isPathInside(this.workingDirectory, abs) || !existsSync2(abs)) {
          return null;
        }
        try {
          const content = readFileSync2(abs, "utf-8");
          return JSON.parse(content);
        } catch {
          return null;
        }
      },
      getFileSize: (relPath) => {
        const normalized = normalizeRelativePath(relPath);
        const file = fileMap.get(normalized);
        if (file) return file.sizeBytes;
        const abs = resolve3(this.workingDirectory, normalized);
        if (!isPathInside(this.workingDirectory, abs) || !existsSync2(abs)) {
          return null;
        }
        try {
          return statSync(abs).size;
        } catch {
          return null;
        }
      }
    };
  }
};

// src/utils/text.ts
function getLocationFromIndex(content, index) {
  if (index < 0 || index > content.length) {
    return { line: 1, column: 1, lineSnippet: "" };
  }
  const prefix = content.slice(0, index);
  const lines = prefix.split("\n");
  const line = lines.length;
  const lastLine = lines[lines.length - 1] ?? "";
  const column = lastLine.length + 1;
  const startOfLine = prefix.lastIndexOf("\n") + 1;
  const endOfLine = content.indexOf("\n", index);
  const fullLine = endOfLine === -1 ? content.slice(startOfLine) : content.slice(startOfLine, endOfLine);
  return {
    line,
    column,
    lineSnippet: fullLine.trim()
  };
}
function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + `... [truncated ${text.length - maxLength} chars]`;
}

// src/utils/redaction.ts
function redactSecret(secret) {
  if (!secret) return "";
  const clean = secret.trim();
  const len = clean.length;
  if (len <= 6) {
    return "******";
  }
  if (len <= 12) {
    return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
  }
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-3);
  return `${prefix}****...****${suffix}`;
}
function redactEvidence(evidence, matchedSecrets) {
  let redacted = evidence;
  for (const secret of matchedSecrets) {
    if (!secret || secret.length < 3) continue;
    const masked = redactSecret(secret);
    redacted = redacted.split(secret).join(masked);
  }
  return redacted;
}
function maskSensitiveKeyValue(key, value) {
  const sensitiveKeyRegex = /(?:password|secret|token|api_?key|credential|private_?key|auth)/i;
  if (sensitiveKeyRegex.test(key)) {
    return redactSecret(value);
  }
  return value;
}

// src/scanners/secret-scanner.ts
var BUILT_IN_PATTERNS = [
  {
    id: "SEC-PK-01",
    name: "Private Key Block",
    regex: /-----BEGIN (?:RSA |OPENSSH |DSA |EC |PGP |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |OPENSSH |DSA |EC |PGP |ENCRYPTED )?PRIVATE KEY-----/g,
    extractValue: (m) => m[0].slice(0, 32)
  },
  {
    id: "SEC-AWS-01",
    name: "AWS Access Key ID",
    regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
    extractValue: (m) => m[0]
  },
  {
    id: "SEC-AWS-02",
    name: "AWS Secret Access Key",
    regex: /(?:aws_secret_access_key|aws_secret_key)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    extractValue: (m) => m[1] ?? m[0]
  },
  {
    id: "SEC-GH-01",
    name: "GitHub Access Token",
    regex: /\b(?:gh[pousr]_[0-9a-zA-Z]{36,255}|github_pat_[0-9a-zA-Z_]{82})\b/g,
    extractValue: (m) => m[0]
  },
  {
    id: "SEC-SLACK-01",
    name: "Slack Token",
    regex: /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/g,
    extractValue: (m) => m[0]
  },
  {
    id: "SEC-SLACK-02",
    name: "Slack Webhook URL",
    regex: /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Za-z_]{8}\/B[0-9A-Za-z_]{8,12}\/[0-9A-Za-z]{24}/g,
    extractValue: (m) => m[0]
  },
  {
    id: "SEC-STRIPE-01",
    name: "Stripe Secret Key",
    regex: /\b(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,34}\b/g,
    extractValue: (m) => m[0]
  },
  {
    id: "SEC-OPENAI-01",
    name: "OpenAI API Key",
    regex: /\b(?:sk-[a-zA-Z0-9]{20,48}|sk-proj-[a-zA-Z0-9_-]{48,})\b/g,
    extractValue: (m) => m[0]
  },
  {
    id: "SEC-GCP-01",
    name: "Google API Key",
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
    extractValue: (m) => m[0]
  },
  {
    id: "SEC-NPM-01",
    name: "npm Access Token",
    regex: /\bnpm_[a-zA-Z0-9]{36}\b/g,
    extractValue: (m) => m[0]
  },
  {
    id: "SEC-WH-01",
    name: "Webhook Signing Secret",
    regex: /\bwhsec_[0-9a-zA-Z]{32,}\b/g,
    extractValue: (m) => m[0]
  },
  {
    id: "SEC-DB-01",
    name: "Database Connection String with Credentials",
    regex: /\b(?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis|amqp):\/\/[^/\s:@]+:[^/\s:@]+@[^/\s]+/gi,
    extractValue: (m) => m[0]
  },
  {
    id: "SEC-ASSIGN-01",
    name: "Hardcoded High-Entropy Secret Assignment",
    regex: /(?:api[_-]?key|secret[_-]?key|auth[_-]?token|access[_-]?token|client[_-]?secret)\s*[:=]\s*["']([A-Za-z0-9_\-+/]{24,})["']/gi,
    extractValue: (m) => m[1] ?? m[0]
  }
];
var IGNORED_SECRET_PLACEHOLDERS = /* @__PURE__ */ new Set([
  "your_api_key_here",
  "your_api_key",
  "change_me",
  "changeme",
  "placeholder",
  "example",
  "dummy_key",
  "dummy_token",
  "replace_me",
  "test_secret",
  "fake_secret",
  "000000000000000000000000",
  "123456789012345678901234",
  "xxxxxxxxxxxxxxxxxxxxxxxx"
]);
var SENSITIVE_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.staging",
  ".env.development.local"
];
var SecretScanner = class {
  config;
  patterns;
  constructor(config) {
    this.config = config;
    this.patterns = [...BUILT_IN_PATTERNS];
    for (const add of this.config.additionalPatterns) {
      try {
        this.patterns.push({
          id: `SEC-CUSTOM-${add.name.toLowerCase().replace(/\s+/g, "-")}`,
          name: add.name,
          regex: new RegExp(add.pattern, "g")
        });
      } catch {
      }
    }
  }
  scan(context, options) {
    const results = [];
    const untrackedFiles = options?.untrackedFiles;
    if (!this.config.enabled) {
      results.push({
        id: "SEC000",
        category: "secrets",
        name: "Secret Scanning",
        status: "skip",
        severity: "info",
        message: "Secret scanning is disabled in configuration."
      });
      return results;
    }
    for (const envFile of SENSITIVE_ENV_FILES) {
      if (!this.config.includeUntracked && untrackedFiles?.has(normalizeRelativePath(envFile))) {
        continue;
      }
      if (context.hasFile(envFile)) {
        const content = context.readFile(envFile);
        if (content && content.trim().length > 0) {
          results.push({
            id: "SEC-ENV-01",
            category: "secrets",
            name: "Sensitive Environment File Present",
            status: "fail",
            severity: "error",
            message: `Sensitive environment file "${envFile}" is present in repository root. Local environment files containing credentials must never be committed.`,
            filePath: envFile,
            line: 1,
            column: 1,
            remediation: `Remove "${envFile}" from git, add it to .gitignore, and rotate any secrets that were stored in this file.`
          });
        }
      }
    }
    const maxBytes = this.config.maxFileSizeKb * 1024;
    for (const file of context.files) {
      if (!this.config.includeUntracked && untrackedFiles?.has(normalizeRelativePath(file.relativePath))) {
        continue;
      }
      if (file.sizeBytes > maxBytes) {
        continue;
      }
      const isTemplateOrExample = file.relativePath.endsWith(".example") || file.relativePath.endsWith(".template") || file.relativePath.endsWith(".sample") || file.relativePath.includes(".template.") || file.relativePath.includes(".example.") || file.relativePath.includes(".sample.");
      if (isTemplateOrExample) {
        continue;
      }
      const content = context.readFile(file.relativePath);
      if (!content) continue;
      for (const pattern of this.patterns) {
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(content)) !== null) {
          const secretValue = pattern.extractValue ? pattern.extractValue(match) : match[0];
          const lowerVal = secretValue.toLowerCase();
          if (IGNORED_SECRET_PLACEHOLDERS.has(lowerVal) || lowerVal === "placeholder" || lowerVal === "your_api_key_here") {
            continue;
          }
          const loc = getLocationFromIndex(content, match.index);
          const maskedSecret = redactSecret(secretValue);
          const safeEvidence = redactEvidence(loc.lineSnippet, [secretValue]);
          results.push({
            id: pattern.id,
            category: "secrets",
            name: `Potential Credential Exposed: ${pattern.name}`,
            status: "fail",
            severity: "error",
            message: `Potential credential matching pattern "${pattern.name}" detected in ${file.relativePath}:${loc.line}. Redacted value: ${maskedSecret}.`,
            filePath: file.relativePath,
            line: loc.line,
            column: loc.column,
            remediation: "Remove the credential immediately, rotate the key in the service dashboard, and inject it securely via GitHub Actions Secrets or environment variables.",
            details: {
              patternName: pattern.name,
              redactedEvidence: safeEvidence
            }
          });
        }
      }
    }
    if (results.length === 0) {
      results.push({
        id: "SEC-PASS-01",
        category: "secrets",
        name: "Local Secret Scan",
        status: "pass",
        severity: "info",
        message: "No exposed credentials or sensitive environment files were detected."
      });
    }
    return results;
  }
};

// src/checks/structure.ts
import { existsSync as existsSync3, statSync as statSync2 } from "node:fs";
import { resolve as resolve4 } from "node:path";
function runStructureChecks(context, config) {
  const results = [];
  if (config.checkReadme) {
    const readmeCandidates = [
      "README.md",
      "README",
      "readme.md",
      "README.markdown",
      "readme.markdown"
    ];
    const foundReadme = readmeCandidates.find((c) => context.hasFile(c));
    if (foundReadme) {
      results.push({
        id: "STRUC-README",
        category: "structure",
        name: "README File Presence",
        status: "pass",
        severity: "info",
        filePath: foundReadme,
        message: `README file found at "${foundReadme}".`
      });
    } else {
      results.push({
        id: "STRUC-README",
        category: "structure",
        name: "README File Presence",
        status: "fail",
        severity: "error",
        filePath: "README.md",
        message: "No README file found. A project README is required to guide users and contributors.",
        remediation: "Create a README.md file in the repository root explaining the project purpose, setup, and usage."
      });
    }
  }
  if (config.checkLicense) {
    const licenseCandidates = [
      "LICENSE",
      "LICENSE.md",
      "LICENSE.txt",
      "LICENCE",
      "LICENCE.md",
      "COPYING",
      "COPYING.txt"
    ];
    const foundLicense = licenseCandidates.find((c) => context.hasFile(c));
    if (foundLicense) {
      results.push({
        id: "STRUC-LICENSE",
        category: "structure",
        name: "License File Presence",
        status: "pass",
        severity: "info",
        filePath: foundLicense,
        message: `License file found at "${foundLicense}".`
      });
    } else {
      results.push({
        id: "STRUC-LICENSE",
        category: "structure",
        name: "License File Presence",
        status: "fail",
        severity: "error",
        filePath: "LICENSE",
        message: "No open-source LICENSE file found in repository root.",
        remediation: "Add a standard open-source LICENSE file (e.g., MIT, Apache-2.0, BSD-3-Clause) to the repository root."
      });
    }
  }
  if (config.checkChangelog) {
    const changelogCandidates = [
      "CHANGELOG.md",
      "CHANGELOG",
      "changelog.md",
      "HISTORY.md",
      "RELEASES.md"
    ];
    const foundChangelog = changelogCandidates.find((c) => context.hasFile(c));
    if (foundChangelog) {
      results.push({
        id: "STRUC-CHANGELOG",
        category: "structure",
        name: "Changelog Presence",
        status: "pass",
        severity: "info",
        filePath: foundChangelog,
        message: `Changelog found at "${foundChangelog}".`
      });
    } else {
      results.push({
        id: "STRUC-CHANGELOG",
        category: "structure",
        name: "Changelog Presence",
        status: "fail",
        severity: "error",
        filePath: "CHANGELOG.md",
        message: "No CHANGELOG.md or HISTORY.md found. Release readiness requires documented version changes.",
        remediation: "Create a CHANGELOG.md file documenting version releases and changes following Keep a Changelog conventions."
      });
    }
  }
  if (config.checkSecurityPolicy) {
    const securityCandidates = [
      "SECURITY.md",
      ".github/SECURITY.md",
      "docs/SECURITY.md",
      "security.md"
    ];
    const foundSec = securityCandidates.find((c) => context.hasFile(c));
    if (foundSec) {
      results.push({
        id: "STRUC-SECURITY",
        category: "structure",
        name: "Security Policy Presence",
        status: "pass",
        severity: "info",
        filePath: foundSec,
        message: `Security policy found at "${foundSec}".`
      });
    } else {
      results.push({
        id: "STRUC-SECURITY",
        category: "structure",
        name: "Security Policy Presence",
        status: "fail",
        severity: "warning",
        filePath: "SECURITY.md",
        message: "No SECURITY.md file found. A security policy is recommended for responsible disclosure.",
        remediation: "Add a SECURITY.md file outlining vulnerability reporting procedures and response expectations."
      });
    }
  }
  if (config.checkContributing) {
    const contribCandidates = [
      "CONTRIBUTING.md",
      ".github/CONTRIBUTING.md",
      "docs/CONTRIBUTING.md",
      "contributing.md"
    ];
    const foundContrib = contribCandidates.find((c) => context.hasFile(c));
    if (foundContrib) {
      results.push({
        id: "STRUC-CONTRIB",
        category: "structure",
        name: "Contribution Guidelines Presence",
        status: "pass",
        severity: "info",
        filePath: foundContrib,
        message: `Contribution guidelines found at "${foundContrib}".`
      });
    } else {
      results.push({
        id: "STRUC-CONTRIB",
        category: "structure",
        name: "Contribution Guidelines Presence",
        status: "fail",
        severity: "warning",
        filePath: "CONTRIBUTING.md",
        message: "No CONTRIBUTING.md guidelines found.",
        remediation: "Add CONTRIBUTING.md outlining branch strategies, PR expectations, and development workflow."
      });
    }
  }
  if (config.checkCodeowners) {
    const codeownerCandidates = ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"];
    const foundCodeowners = codeownerCandidates.find((c) => context.hasFile(c));
    if (foundCodeowners) {
      results.push({
        id: "STRUC-CODEOWNERS",
        category: "structure",
        name: "Code Ownership Configuration",
        status: "pass",
        severity: "info",
        filePath: foundCodeowners,
        message: `Codeowners file found at "${foundCodeowners}".`
      });
    } else {
      results.push({
        id: "STRUC-CODEOWNERS",
        category: "structure",
        name: "Code Ownership Configuration",
        status: "fail",
        severity: "warning",
        filePath: ".github/CODEOWNERS",
        message: "No CODEOWNERS file configured.",
        remediation: "Create a .github/CODEOWNERS file defining responsible teams or reviewers for repository paths."
      });
    }
  }
  if (config.checkCiWorkflow) {
    const hasWorkflows = context.files.some(
      (f) => f.relativePath.startsWith(".github/workflows/") && (f.extension === ".yml" || f.extension === ".yaml")
    );
    if (hasWorkflows) {
      results.push({
        id: "STRUC-CI",
        category: "structure",
        name: "CI Workflow Configuration",
        status: "pass",
        severity: "info",
        message: "GitHub Actions workflow configurations detected in .github/workflows/."
      });
    } else {
      results.push({
        id: "STRUC-CI",
        category: "structure",
        name: "CI Workflow Configuration",
        status: "fail",
        severity: "warning",
        filePath: ".github/workflows",
        message: "No CI workflow files found in .github/workflows/. Automated testing and validation workflows should be defined.",
        remediation: "Add a GitHub Actions workflow in .github/workflows/ to test, lint, and build your project on push and PR."
      });
    }
  }
  if (config.checkReleaseNotes) {
    const releaseNotesCandidates = [
      "RELEASE_NOTES.md",
      "release-notes.md",
      "docs/RELEASE_NOTES.md",
      ".github/RELEASE_NOTES.md"
    ];
    const foundReleaseNotes = releaseNotesCandidates.find((c) => context.hasFile(c));
    if (foundReleaseNotes) {
      results.push({
        id: "STRUC-RELEASE-NOTES",
        category: "structure",
        name: "Release Notes Presence",
        status: "pass",
        severity: "info",
        filePath: foundReleaseNotes,
        message: `Release notes found at "${foundReleaseNotes}".`
      });
    } else {
      results.push({
        id: "STRUC-RELEASE-NOTES",
        category: "structure",
        name: "Release Notes Presence",
        status: "fail",
        severity: "warning",
        filePath: "RELEASE_NOTES.md",
        message: "No RELEASE_NOTES.md file found.",
        remediation: "Add a RELEASE_NOTES.md file summarizing changes, upgrade notes, and known issues for the release."
      });
    }
  }
  for (const reqFile of config.requiredFiles) {
    if (context.hasFile(reqFile)) {
      results.push({
        id: `STRUC-REQ-FILE-${reqFile.replace(/[^a-zA-Z0-9]/g, "_")}`,
        category: "structure",
        name: `Required File: ${reqFile}`,
        status: "pass",
        severity: "info",
        filePath: reqFile,
        message: `Configured required file "${reqFile}" exists.`
      });
    } else {
      results.push({
        id: `STRUC-REQ-FILE-${reqFile.replace(/[^a-zA-Z0-9]/g, "_")}`,
        category: "structure",
        name: `Required File: ${reqFile}`,
        status: "fail",
        severity: "error",
        filePath: reqFile,
        message: `Required file "${reqFile}" is missing.`,
        remediation: `Ensure "${reqFile}" is committed and present in the repository before release.`
      });
    }
  }
  for (const reqDir of config.requiredDirectories) {
    const dirAbs = resolve4(context.workingDirectory, reqDir);
    const exists = existsSync3(dirAbs) && statSync2(dirAbs).isDirectory();
    if (exists) {
      results.push({
        id: `STRUC-REQ-DIR-${reqDir.replace(/[^a-zA-Z0-9]/g, "_")}`,
        category: "structure",
        name: `Required Directory: ${reqDir}`,
        status: "pass",
        severity: "info",
        filePath: reqDir,
        message: `Configured required directory "${reqDir}" exists.`
      });
    } else {
      results.push({
        id: `STRUC-REQ-DIR-${reqDir.replace(/[^a-zA-Z0-9]/g, "_")}`,
        category: "structure",
        name: `Required Directory: ${reqDir}`,
        status: "fail",
        severity: "error",
        filePath: reqDir,
        message: `Required directory "${reqDir}" is missing.`,
        remediation: `Ensure directory "${reqDir}" exists in the repository before release.`
      });
    }
  }
  return results;
}

// src/checks/documentation.ts
function runDocumentationChecks(context, config) {
  const results = [];
  const docCandidates = [
    "README.md",
    "README",
    "LICENSE",
    "LICENSE.md",
    "CHANGELOG.md",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "RELEASE_NOTES.md",
    "RELEASE_CHECKLIST.md"
  ];
  const filesToCheck = /* @__PURE__ */ new Set();
  const requiredDocMap = new Map(config.requiredDocs.map((d) => [d.path, d]));
  for (const candidate of docCandidates) {
    if (context.hasFile(candidate)) {
      filesToCheck.add(candidate);
    }
  }
  for (const reqDoc of config.requiredDocs) {
    filesToCheck.add(reqDoc.path);
  }
  for (const filePath of filesToCheck) {
    const exists = context.hasFile(filePath);
    if (!exists) {
      results.push({
        id: `DOC-REQ-${filePath.replace(/[^a-zA-Z0-9]/g, "_")}`,
        category: "documentation",
        name: `Required Documentation: ${filePath}`,
        status: "fail",
        severity: "error",
        filePath,
        message: `Configured documentation file "${filePath}" does not exist.`,
        remediation: `Create the "${filePath}" documentation file.`
      });
      continue;
    }
    const reqDoc = requiredDocMap.get(filePath);
    const content = context.readFile(filePath);
    const size = context.getFileSize(filePath) ?? 0;
    const minSize = reqDoc?.minSize ?? config.minFileSizeBytes;
    if (!content || content.trim().length === 0 || size < minSize) {
      results.push({
        id: `DOC-EMPTY-${filePath.replace(/[^a-zA-Z0-9]/g, "_")}`,
        category: "documentation",
        name: `Empty or Incomplete Documentation: ${filePath}`,
        status: "fail",
        severity: "error",
        filePath,
        line: 1,
        column: 1,
        message: `Documentation file "${filePath}" is empty or trivial (${size} bytes, minimum required is ${minSize} bytes).`,
        remediation: `Add meaningful content to "${filePath}". Ensure it contains accurate guidance for the release.`
      });
      continue;
    }
    let hasIssue = false;
    if (reqDoc?.title && !content.toLowerCase().includes(reqDoc.title.toLowerCase())) {
      results.push({
        id: `DOC-TITLE-${filePath.replace(/[^a-zA-Z0-9]/g, "_")}`,
        category: "documentation",
        name: `Documentation Title Check: ${filePath}`,
        status: "fail",
        severity: "error",
        filePath,
        line: 1,
        column: 1,
        message: `Documentation file "${filePath}" does not contain required title "${reqDoc.title}".`,
        remediation: `Add the title or heading "${reqDoc.title}" to "${filePath}".`
      });
      hasIssue = true;
    }
    if (config.disallowPlaceholders && config.placeholderPatterns.length > 0) {
      const maskPreservingNewlines = (match) => match.replace(/[^\n]/g, " ");
      const textToScan = filePath.endsWith(".md") ? content.replace(/```[\s\S]*?```/g, maskPreservingNewlines).replace(/`[^`\n]+`/g, maskPreservingNewlines) : content;
      for (const pattern of config.placeholderPatterns) {
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const prefix = /^\w/.test(pattern) ? "\\b" : "";
        const suffix = /\w$/.test(pattern) ? "\\b" : "";
        const regex = new RegExp(`${prefix}${escaped}${suffix}`, "i");
        const match = regex.exec(textToScan);
        if (match) {
          const loc = getLocationFromIndex(content, match.index);
          results.push({
            id: `DOC-PLACEHOLDER-${filePath.replace(/[^a-zA-Z0-9]/g, "_")}`,
            category: "documentation",
            name: `Unresolved Placeholder in ${filePath}`,
            status: "warn",
            severity: "warning",
            filePath,
            line: loc.line,
            column: loc.column,
            message: `Unresolved placeholder "${match[0]}" found in "${filePath}" on line ${loc.line}: "${loc.lineSnippet}".`,
            remediation: `Review "${filePath}" and replace template placeholders with actual release documentation.`
          });
          hasIssue = true;
          break;
        }
      }
    }
    if (!hasIssue) {
      results.push({
        id: `DOC-VALID-${filePath.replace(/[^a-zA-Z0-9]/g, "_")}`,
        category: "documentation",
        name: `Documentation Content: ${filePath}`,
        status: "pass",
        severity: "info",
        filePath,
        message: config.disallowPlaceholders ? `Documentation file "${filePath}" contains valid non-placeholder content (${size} bytes).` : `Documentation file "${filePath}" is present and non-empty (${size} bytes).`
      });
    }
  }
  return results;
}

// src/utils/subprocess.ts
import { spawn } from "node:child_process";
import { existsSync as existsSync4 } from "node:fs";
import { dirname, join as join3 } from "node:path";
var SAFE_ENV_KEYS = [
  "PATH",
  "HOME",
  "TMPDIR",
  "TMP",
  "TEMP",
  "CI",
  "NODE_ENV",
  "SystemRoot",
  "SYSTEMROOT",
  "ComSpec",
  "COMSPEC",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "PATHEXT",
  "NUMBER_OF_PROCESSORS"
];
function buildSafeEnv(extraEnv) {
  const safeEnv = {};
  for (const key of SAFE_ENV_KEYS) {
    const val = process.env[key];
    if (val !== void 0) {
      safeEnv[key] = val;
    }
  }
  if (!safeEnv.TMPDIR) {
    safeEnv.TMPDIR = process.env.TMPDIR || process.env.TMP || "/tmp";
  }
  if (extraEnv) {
    Object.assign(safeEnv, extraEnv);
  }
  return safeEnv;
}
function resolveCommand(command, args, shell) {
  if (process.platform === "win32" && !shell && (command === "npm" || command === "npx")) {
    const cliFile = command === "npm" ? "npm-cli.js" : "npx-cli.js";
    const cliPath = join3(dirname(process.execPath), "node_modules", "npm", "bin", cliFile);
    if (existsSync4(cliPath)) {
      return {
        executable: process.execPath,
        spawnArgs: [cliPath, ...args]
      };
    }
  }
  return {
    executable: command,
    spawnArgs: args
  };
}
async function executeSubprocess(command, args = [], options = {}) {
  const {
    cwd = process.cwd(),
    timeoutMs = 6e4,
    maxOutputBytes = 1024 * 1024,
    // 1MB buffer cap to prevent OOM
    env,
    shell = false
  } = options;
  const startTime = Date.now();
  let timedOut = false;
  let stdoutBuffer = "";
  let stderrBuffer = "";
  let stdoutTruncated = false;
  let stderrTruncated = false;
  const safeEnv = buildSafeEnv(env);
  const { executable, spawnArgs } = resolveCommand(command, args, shell);
  return new Promise((resolve5) => {
    let child;
    try {
      child = spawn(executable, spawnArgs, {
        cwd,
        env: safeEnv,
        shell,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (err) {
      return resolve5({
        command,
        args,
        exitCode: null,
        stdout: "",
        stderr: "",
        timedOut: false,
        durationMs: Date.now() - startTime,
        error: err instanceof Error ? err : new Error(String(err))
      });
    }
    let timeoutTimer = null;
    let forceKillTimer = null;
    if (timeoutMs > 0) {
      timeoutTimer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill("SIGTERM");
        } catch {
        }
        forceKillTimer = setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
          }
        }, 2e3);
      }, timeoutMs);
    }
    child.stdout?.on("data", (chunk) => {
      if (stdoutBuffer.length < maxOutputBytes) {
        stdoutBuffer += chunk.toString("utf-8");
        if (stdoutBuffer.length >= maxOutputBytes && !stdoutTruncated) {
          stdoutTruncated = true;
          stdoutBuffer = truncateText(stdoutBuffer, maxOutputBytes) + "\n[Process stdout truncated: maximum output limit reached]";
        }
      }
    });
    child.stderr?.on("data", (chunk) => {
      if (stderrBuffer.length < maxOutputBytes) {
        stderrBuffer += chunk.toString("utf-8");
        if (stderrBuffer.length >= maxOutputBytes && !stderrTruncated) {
          stderrTruncated = true;
          stderrBuffer = truncateText(stderrBuffer, maxOutputBytes) + "\n[Process stderr truncated: maximum output limit reached]";
        }
      }
    });
    child.on("error", (err) => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      resolve5({
        command,
        args,
        exitCode: null,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        timedOut,
        durationMs: Date.now() - startTime,
        error: err
      });
    });
    child.on("close", (code) => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      resolve5({
        command,
        args,
        exitCode: code,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        timedOut,
        durationMs: Date.now() - startTime
      });
    });
  });
}

// src/utils/git.ts
async function isGitRepo(cwd) {
  const result = await executeSubprocess("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd,
    timeoutMs: 5e3
  });
  return result.exitCode === 0 && result.stdout.trim() === "true";
}
async function getGitStatus(cwd) {
  const result = await executeSubprocess("git", ["status", "--porcelain"], {
    cwd,
    timeoutMs: 1e4
  });
  if (result.exitCode !== 0) {
    return {
      isClean: true,
      modified: [],
      untracked: [],
      raw: ""
    };
  }
  const lines = result.stdout.split("\n").filter((l) => l.trim().length > 0);
  const modified = [];
  const untracked = [];
  for (const line of lines) {
    const status = line.slice(0, 2);
    const file = line.slice(3).trim();
    if (status.includes("?")) {
      untracked.push(file);
    } else {
      modified.push(file);
    }
  }
  return {
    isClean: lines.length === 0,
    modified,
    untracked,
    raw: result.stdout
  };
}
async function getCurrentGitTag(cwd) {
  const githubRef = process.env.GITHUB_REF;
  if (githubRef && githubRef.startsWith("refs/tags/")) {
    return githubRef.replace("refs/tags/", "");
  }
  const result = await executeSubprocess("git", ["describe", "--tags", "--exact-match"], {
    cwd,
    timeoutMs: 5e3
  });
  if (result.exitCode === 0 && result.stdout.trim().length > 0) {
    return result.stdout.trim();
  }
  return null;
}
async function getCurrentGitBranch(cwd) {
  if (process.env.GITHUB_HEAD_REF) {
    return process.env.GITHUB_HEAD_REF;
  }
  if (process.env.GITHUB_REF_NAME) {
    return process.env.GITHUB_REF_NAME;
  }
  const result = await executeSubprocess("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd,
    timeoutMs: 5e3
  });
  if (result.exitCode === 0 && result.stdout.trim().length > 0) {
    return result.stdout.trim();
  }
  return null;
}
async function getUntrackedGitFiles(cwd) {
  const result = await executeSubprocess("git", ["ls-files", "--others", "--exclude-standard"], {
    cwd,
    timeoutMs: 1e4
  });
  if (result.exitCode !== 0) {
    return /* @__PURE__ */ new Set();
  }
  const files = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0).map((line) => normalizeRelativePath(line));
  return new Set(files);
}

// src/checks/package.ts
var SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
var NPM_PACKAGE_NAME_REGEX = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
async function runPackageChecks(context, config) {
  const results = [];
  if (!config.enabled) {
    return results;
  }
  if (!context.hasFile("package.json")) {
    return results;
  }
  const pkgJsonRaw = context.readFile("package.json");
  if (!pkgJsonRaw) {
    results.push({
      id: "PKG-READ-ERR",
      category: "package",
      name: "Read package.json",
      status: "fail",
      severity: "error",
      filePath: "package.json",
      message: "Failed to read package.json content.",
      remediation: "Ensure package.json is accessible and readable."
    });
    return results;
  }
  let pkg;
  try {
    pkg = JSON.parse(pkgJsonRaw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({
      id: "PKG-JSON-SYNTAX",
      category: "package",
      name: "Valid package.json Syntax",
      status: "fail",
      severity: "error",
      filePath: "package.json",
      message: `package.json contains invalid JSON syntax: ${msg}`,
      remediation: "Correct JSON syntax in package.json."
    });
    return results;
  }
  if (config.requireName) {
    if (!pkg.name || typeof pkg.name !== "string" || pkg.name.trim().length === 0) {
      results.push({
        id: "PKG-NAME-REQ",
        category: "package",
        name: "Package Name Presence",
        status: "fail",
        severity: "error",
        filePath: "package.json",
        message: 'Missing or empty "name" field in package.json.',
        remediation: "Specify a valid package name in package.json."
      });
    } else {
      const isPrivate = Boolean(pkg.private);
      if (!isPrivate && !NPM_PACKAGE_NAME_REGEX.test(pkg.name)) {
        results.push({
          id: "PKG-NAME-FORMAT",
          category: "package",
          name: "Package Name Format",
          status: "warn",
          severity: "warning",
          filePath: "package.json",
          message: `Package name "${pkg.name}" does not follow standard npm naming conventions.`,
          remediation: "Use lowercase letters, numbers, hyphens, and optional scope (e.g. @scope/name)."
        });
      } else {
        results.push({
          id: "PKG-NAME-VALID",
          category: "package",
          name: "Package Name",
          status: "pass",
          severity: "info",
          filePath: "package.json",
          message: `Package name "${pkg.name}" is valid.`
        });
      }
    }
  }
  if (config.requireVersion) {
    if (!pkg.version || typeof pkg.version !== "string") {
      results.push({
        id: "PKG-VERSION-REQ",
        category: "package",
        name: "Package Version Presence",
        status: "fail",
        severity: "error",
        filePath: "package.json",
        message: 'Missing or invalid "version" field in package.json.',
        remediation: "Specify a valid version in package.json."
      });
    } else if (config.validateSemver) {
      if (!SEMVER_REGEX.test(pkg.version)) {
        results.push({
          id: "PKG-VERSION-SEMVER",
          category: "package",
          name: "Semantic Versioning Format",
          status: "fail",
          severity: "error",
          filePath: "package.json",
          message: `Version "${pkg.version}" is not a valid Semantic Version (expected format X.Y.Z[-prerelease]).`,
          remediation: "Update package.json version to comply with SemVer 2.0.0 (e.g., 1.0.0)."
        });
      } else {
        results.push({
          id: "PKG-VERSION-VALID",
          category: "package",
          name: "Package Version",
          status: "pass",
          severity: "info",
          filePath: "package.json",
          message: `Package version "${pkg.version}" conforms to SemVer.`
        });
      }
    }
  }
  if (config.requireDescription) {
    if (!pkg.description || typeof pkg.description !== "string" || pkg.description.trim().length === 0) {
      results.push({
        id: "PKG-DESC-REQ",
        category: "package",
        name: "Package Description",
        status: "fail",
        severity: "warning",
        filePath: "package.json",
        message: 'Missing or empty "description" in package.json.',
        remediation: "Add a concise description explaining what the package does."
      });
    }
  }
  if (config.requireLicense) {
    if (!pkg.license || typeof pkg.license !== "string" || pkg.license.trim().length === 0) {
      results.push({
        id: "PKG-LICENSE-REQ",
        category: "package",
        name: "Package License Field",
        status: "fail",
        severity: "warning",
        filePath: "package.json",
        message: 'Missing "license" field in package.json.',
        remediation: 'Add a valid SPDX license identifier (e.g. "MIT", "Apache-2.0") or "UNLICENSED".'
      });
    } else {
      results.push({
        id: "PKG-LICENSE-VALID",
        category: "package",
        name: "Package License",
        status: "pass",
        severity: "info",
        filePath: "package.json",
        message: `Package license declared as "${pkg.license}".`
      });
    }
  }
  if (config.requireRepository) {
    if (!pkg.repository) {
      results.push({
        id: "PKG-REPO-REQ",
        category: "package",
        name: "Repository Field",
        status: "fail",
        severity: "warning",
        filePath: "package.json",
        message: 'Missing "repository" field in package.json.',
        remediation: 'Add a "repository" field linking to the source code repository.'
      });
    }
  }
  if (config.validateEntryPoints) {
    const entryPointsToCheck = [];
    if (typeof pkg.main === "string") {
      entryPointsToCheck.push({ field: "main", path: pkg.main });
    }
    if (typeof pkg.module === "string") {
      entryPointsToCheck.push({ field: "module", path: pkg.module });
    }
    if (typeof pkg.types === "string") {
      entryPointsToCheck.push({ field: "types", path: pkg.types });
    }
    if (typeof pkg.typings === "string") {
      entryPointsToCheck.push({ field: "typings", path: pkg.typings });
    }
    if (typeof pkg.bin === "string") {
      entryPointsToCheck.push({ field: "bin", path: pkg.bin });
    } else if (pkg.bin && typeof pkg.bin === "object") {
      for (const [binName, binPath] of Object.entries(pkg.bin)) {
        if (typeof binPath === "string") {
          entryPointsToCheck.push({ field: `bin.${binName}`, path: binPath });
        }
      }
    }
    const collectExports = (exp, prefix = "exports") => {
      if (typeof exp === "string") {
        entryPointsToCheck.push({ field: prefix, path: exp });
      } else if (exp && typeof exp === "object") {
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
      if (cleanPath.includes("*")) continue;
      if (!context.hasFile(cleanPath)) {
        results.push({
          id: `PKG-ENTRY-MISSING-${ep.field.replace(/[^a-zA-Z0-9]/g, "_")}`,
          category: "package",
          name: `Declared Entry Point Exists: ${ep.field}`,
          status: "fail",
          severity: "error",
          filePath: "package.json",
          message: `Declared entry point "${ep.field}" points to "${cleanPath}" which does not exist on disk.`,
          remediation: `Ensure build artifacts are generated (e.g. run "npm run build") before release evaluation, or fix the "${ep.field}" path in package.json.`
        });
      } else {
        results.push({
          id: `PKG-ENTRY-VALID-${ep.field.replace(/[^a-zA-Z0-9]/g, "_")}`,
          category: "package",
          name: `Declared Entry Point Exists: ${ep.field}`,
          status: "pass",
          severity: "info",
          filePath: cleanPath,
          message: `Entry point "${ep.field}" (${cleanPath}) exists on disk.`
        });
      }
    }
  }
  if (config.validateFilesWhitelist && Array.isArray(pkg.files)) {
    const suspectPatterns = [".env", "test", "tests", "__tests__", "coverage", ".tsbuildinfo"];
    for (const entry of pkg.files) {
      if (typeof entry === "string") {
        for (const suspect of suspectPatterns) {
          if (entry === suspect || entry.startsWith(suspect + "/")) {
            results.push({
              id: `PKG-FILES-DEV-ARTIFACT-${entry.replace(/[^a-zA-Z0-9]/g, "_")}`,
              category: "package",
              name: "Package Files Whitelist",
              status: "warn",
              severity: "warning",
              filePath: "package.json",
              message: `The "files" array in package.json includes "${entry}", which may accidentally expose development artifacts in published packages.`,
              remediation: `Review the "files" array in package.json and remove unnecessary test or environment directories.`
            });
          }
        }
      }
    }
  }
  if (config.checkTagVersionMatch) {
    const gitTag = await getCurrentGitTag(context.workingDirectory);
    if (gitTag) {
      const normalizedTag = gitTag.replace(/^v/, "");
      if (normalizedTag === pkg.version) {
        results.push({
          id: "PKG-TAG-MATCH",
          category: "package",
          name: "Git Tag Version Match",
          status: "pass",
          severity: "info",
          message: `Git tag "${gitTag}" matches package.json version "${pkg.version}".`
        });
      } else {
        results.push({
          id: "PKG-TAG-MATCH",
          category: "package",
          name: "Git Tag Version Match",
          status: "fail",
          severity: "error",
          filePath: "package.json",
          message: `Git tag "${gitTag}" does not match package.json version "${pkg.version}".`,
          remediation: `Align git tag with package version or update package.json version to "${normalizedTag}".`
        });
      }
    }
  }
  return results;
}

// src/checks/scripts.ts
async function runScriptChecks(context, config) {
  const results = [];
  const pkg = context.readJson("package.json");
  const availableScripts = pkg && typeof pkg.scripts === "object" && pkg.scripts !== null ? pkg.scripts : {};
  if (config.requiredScripts.length > 0) {
    for (const scriptName of config.requiredScripts) {
      if (availableScripts[scriptName]) {
        results.push({
          id: `SCRIPT-DEF-${scriptName.replace(/[^a-zA-Z0-9]/g, "_")}`,
          category: "scripts",
          name: `Required Script Defined: "${scriptName}"`,
          status: "pass",
          severity: "info",
          filePath: "package.json",
          message: `Required script "${scriptName}" is defined in package.json.`
        });
      } else {
        results.push({
          id: `SCRIPT-DEF-${scriptName.replace(/[^a-zA-Z0-9]/g, "_")}`,
          category: "scripts",
          name: `Required Script Defined: "${scriptName}"`,
          status: "fail",
          severity: "error",
          filePath: "package.json",
          message: `Required script "${scriptName}" is not defined in package.json scripts.`,
          remediation: `Add a "${scriptName}" script to package.json scripts block.`
        });
      }
    }
  }
  if (!config.execute) {
    if (config.requiredScripts.length > 0 || config.commands.length > 0) {
      results.push({
        id: "SCRIPT-EXEC-OPTIN",
        category: "scripts",
        name: "Automated Script Execution",
        status: "skip",
        severity: "info",
        message: 'Script execution is disabled by default for security. Set "execute-scripts: true" in action inputs to run validation commands automatically.'
      });
    }
    return results;
  }
  for (const cmd of config.commands) {
    const subResult = await executeSubprocess(cmd.command, cmd.args, {
      cwd: context.workingDirectory,
      timeoutMs: cmd.timeoutMs || config.timeoutMs,
      maxOutputBytes: config.maxOutputBytes
    });
    const isSuccess = subResult.exitCode === 0;
    const isRequired = cmd.required !== false;
    if (subResult.timedOut) {
      results.push({
        id: `SCRIPT-EXEC-${cmd.name.replace(/[^a-zA-Z0-9]/g, "_")}`,
        category: "scripts",
        name: `Script Execution: ${cmd.name}`,
        status: "fail",
        severity: isRequired ? "error" : "warning",
        message: `Command "${cmd.command} ${cmd.args.join(" ")}" timed out after ${cmd.timeoutMs || config.timeoutMs}ms.`,
        remediation: "Investigate hanging operations or increase the command timeout setting.",
        details: {
          timedOut: true,
          durationMs: subResult.durationMs
        }
      });
    } else if (subResult.error) {
      results.push({
        id: `SCRIPT-EXEC-${cmd.name.replace(/[^a-zA-Z0-9]/g, "_")}`,
        category: "scripts",
        name: `Script Execution: ${cmd.name}`,
        status: "fail",
        severity: isRequired ? "error" : "warning",
        message: `Failed to spawn executable "${cmd.command}": ${subResult.error.message}`,
        remediation: `Ensure "${cmd.command}" is installed and available on PATH in the runner environment.`
      });
    } else if (!isSuccess) {
      const outputSnippet = truncateText(
        (subResult.stderr || subResult.stdout || "Command failed with exit code " + subResult.exitCode).trim(),
        500
      );
      results.push({
        id: `SCRIPT-EXEC-${cmd.name.replace(/[^a-zA-Z0-9]/g, "_")}`,
        category: "scripts",
        name: `Script Execution: ${cmd.name}`,
        status: "fail",
        severity: isRequired ? "error" : "warning",
        message: `Command "${cmd.command} ${cmd.args.join(" ")}" failed with exit code ${subResult.exitCode}. Output: ${outputSnippet}`,
        remediation: `Resolve build/test errors causing "${cmd.name}" to exit with code ${subResult.exitCode}.`,
        details: {
          exitCode: subResult.exitCode,
          durationMs: subResult.durationMs
        }
      });
    } else {
      results.push({
        id: `SCRIPT-EXEC-${cmd.name.replace(/[^a-zA-Z0-9]/g, "_")}`,
        category: "scripts",
        name: `Script Execution: ${cmd.name}`,
        status: "pass",
        severity: "info",
        message: `Command "${cmd.command} ${cmd.args.join(" ")}" completed successfully in ${subResult.durationMs}ms.`,
        details: {
          durationMs: subResult.durationMs
        }
      });
    }
  }
  return results;
}

// src/checks/dependencies.ts
var KNOWN_LOCKFILES = [
  { name: "package-lock.json", manager: "npm" },
  { name: "pnpm-lock.yaml", manager: "pnpm" },
  { name: "yarn.lock", manager: "yarn" },
  { name: "bun.lockb", manager: "bun" }
];
async function runDependencyChecks(context, config) {
  const results = [];
  const hasPackageJson = context.hasFile("package.json");
  if (!hasPackageJson) {
    return results;
  }
  const pkg = context.readJson("package.json");
  const detectedLockfiles = KNOWN_LOCKFILES.filter((l) => context.hasFile(l.name));
  if (config.checkLockfile) {
    if (detectedLockfiles.length === 0) {
      results.push({
        id: "DEP-LOCKFILE-MISSING",
        category: "dependencies",
        name: "Lockfile Presence",
        status: "fail",
        severity: "error",
        filePath: "package.json",
        message: "No dependency lockfile detected (package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lockb). A committed lockfile is required for deterministic release builds.",
        remediation: 'Run your package manager install command (e.g., "npm install") and commit the generated lockfile to version control.'
      });
    } else {
      const lockNames = detectedLockfiles.map((l) => l.name).join(", ");
      results.push({
        id: "DEP-LOCKFILE-FOUND",
        category: "dependencies",
        name: "Lockfile Presence",
        status: "pass",
        severity: "info",
        filePath: detectedLockfiles[0]?.name,
        message: `Committed dependency lockfile detected: ${lockNames}.`
      });
    }
  }
  if (config.checkMultipleLockfiles && detectedLockfiles.length > 1) {
    const lockNames = detectedLockfiles.map((l) => l.name).join(", ");
    results.push({
      id: "DEP-LOCKFILE-CONFLICT",
      category: "dependencies",
      name: "Consistent Lockfile Configuration",
      status: "warn",
      severity: "warning",
      message: `Multiple conflicting lockfiles detected in repository root: ${lockNames}. This can lead to non-deterministic dependency installations across environments.`,
      remediation: "Standardize on a single package manager for the repository and delete superseded lockfiles."
    });
  }
  if (pkg && typeof pkg.packageManager === "string" && detectedLockfiles.length > 0) {
    const declaredManager = pkg.packageManager.split("@")[0]?.toLowerCase();
    const matchesAny = detectedLockfiles.some((l) => l.manager === declaredManager);
    if (!matchesAny) {
      results.push({
        id: "DEP-MANAGER-MISMATCH",
        category: "dependencies",
        name: "Package Manager Consistency",
        status: "warn",
        severity: "warning",
        filePath: "package.json",
        message: `package.json specifies packageManager "${pkg.packageManager}", but lockfile present is for ${detectedLockfiles.map((l) => l.manager).join(", ")}.`,
        remediation: "Ensure the lockfile matches the package manager specified in package.json."
      });
    }
  }
  if (config.audit) {
    const auditRes = await executeSubprocess("npm", ["audit", "--json"], {
      cwd: context.workingDirectory,
      timeoutMs: 3e4
    });
    if (auditRes.timedOut) {
      results.push({
        id: "DEP-AUDIT-TIMEOUT",
        category: "dependencies",
        name: "Dependency Vulnerability Audit",
        status: "fail",
        severity: "warning",
        message: "npm audit timed out after 30 seconds.",
        remediation: "Check network connectivity or runner registry configuration."
      });
    } else if (auditRes.error) {
      results.push({
        id: "DEP-AUDIT-EXEC-ERR",
        category: "dependencies",
        name: "Dependency Vulnerability Audit",
        status: "warn",
        severity: "warning",
        message: `Failed to execute npm audit: ${auditRes.error.message}`,
        remediation: "Ensure npm is available in the runner environment."
      });
    } else {
      try {
        const auditData = JSON.parse(auditRes.stdout);
        const vulns = auditData.metadata?.vulnerabilities || auditData.vulnerabilities || {};
        const criticalCount = vulns.critical || 0;
        const highCount = vulns.high || 0;
        const moderateCount = vulns.moderate || 0;
        const totalCount = (vulns.total !== void 0 ? vulns.total : criticalCount + highCount + moderateCount) || 0;
        const meetsThreshold = config.auditLevel === "critical" && criticalCount > 0 || config.auditLevel === "high" && (criticalCount > 0 || highCount > 0) || config.auditLevel === "moderate" && (criticalCount > 0 || highCount > 0 || moderateCount > 0) || config.auditLevel === "low" && totalCount > 0;
        if (meetsThreshold) {
          results.push({
            id: "DEP-AUDIT-VULNS",
            category: "dependencies",
            name: "Dependency Vulnerability Audit",
            status: "fail",
            severity: "error",
            message: `Dependency audit detected vulnerabilities exceeding ${config.auditLevel} threshold (Critical: ${criticalCount}, High: ${highCount}, Moderate: ${moderateCount}).`,
            remediation: 'Run "npm audit fix" or upgrade vulnerable dependencies before release.',
            details: { vulnerabilities: vulns }
          });
        } else {
          results.push({
            id: "DEP-AUDIT-PASS",
            category: "dependencies",
            name: "Dependency Vulnerability Audit",
            status: "pass",
            severity: "info",
            message: `Dependency audit passed with 0 vulnerabilities at or above ${config.auditLevel} severity (Note: audit verifies known vulnerabilities at scan time).`
          });
        }
      } catch {
        results.push({
          id: "DEP-AUDIT-PARSE-ERR",
          category: "dependencies",
          name: "Dependency Vulnerability Audit",
          status: "warn",
          severity: "warning",
          message: "Unable to parse npm audit output."
        });
      }
    }
  } else {
    results.push({
      id: "DEP-AUDIT-OPTIN",
      category: "dependencies",
      name: "Dependency Vulnerability Audit",
      status: "skip",
      severity: "info",
      message: 'Dependency vulnerability audit is disabled by default to prevent external network calls. Set "audit-dependencies: true" to enable.'
    });
  }
  return results;
}

// src/checks/git.ts
async function runGitChecks(context, config) {
  const results = [];
  const inGit = await isGitRepo(context.workingDirectory);
  if (!inGit) {
    if (config.checkUncommitted || config.checkBranch) {
      results.push({
        id: "GIT-NOT-REPO",
        category: "git",
        name: "Git Repository Status",
        status: "warn",
        severity: "warning",
        message: "The working directory is not a Git repository or .git is absent."
      });
    }
    return results;
  }
  if (config.checkUncommitted) {
    const status = await getGitStatus(context.workingDirectory);
    if (!status.isClean) {
      const summary2 = [
        status.modified.length > 0 ? `${status.modified.length} modified` : null,
        status.untracked.length > 0 ? `${status.untracked.length} untracked` : null
      ].filter(Boolean).join(", ");
      results.push({
        id: "GIT-DIRTY-TREE",
        category: "git",
        name: "Clean Git Working Tree",
        status: "fail",
        severity: "error",
        message: `Working tree has uncommitted changes (${summary2}). Release builds must be reproducible from committed revisions.`,
        remediation: "Commit all release artifacts and source modifications, or add untracked build outputs to .gitignore.",
        details: {
          modified: status.modified.slice(0, 10),
          untracked: status.untracked.slice(0, 10)
        }
      });
    } else {
      results.push({
        id: "GIT-CLEAN-TREE",
        category: "git",
        name: "Clean Git Working Tree",
        status: "pass",
        severity: "info",
        message: "Git working tree is completely clean (no uncommitted or untracked changes)."
      });
    }
  }
  if (config.checkBranch) {
    const currentBranch = await getCurrentGitBranch(context.workingDirectory);
    if (currentBranch) {
      const matchesBranch = config.allowedBranches.some((pat) => {
        if (pat.endsWith("*")) {
          return currentBranch.startsWith(pat.slice(0, -1));
        }
        return currentBranch === pat;
      });
      if (matchesBranch) {
        results.push({
          id: "GIT-BRANCH-ALLOWED",
          category: "git",
          name: "Authorized Release Branch",
          status: "pass",
          severity: "info",
          message: `Current branch "${currentBranch}" is authorized for release.`
        });
      } else {
        results.push({
          id: "GIT-BRANCH-UNAUTHORIZED",
          category: "git",
          name: "Authorized Release Branch",
          status: "fail",
          severity: "error",
          message: `Current branch "${currentBranch}" is not in the allowed release branches list (${config.allowedBranches.join(", ")}).`,
          remediation: `Releases should only be triggered from designated branches: ${config.allowedBranches.join(", ")}.`
        });
      }
    }
  }
  return results;
}

// src/checks/checklist.ts
function runChecklistChecks(context, config) {
  const results = [];
  const candidateFiles = config.checklistFile ? [config.checklistFile] : ["RELEASE_CHECKLIST.md", ".github/release-checklist.md", "docs/RELEASE_CHECKLIST.md"];
  const foundFile = candidateFiles.find((f) => context.hasFile(f));
  if (config.checklistFile && !foundFile) {
    results.push({
      id: "CHK-FILE-MISSING",
      category: "checklist",
      name: "Release Checklist File",
      status: "fail",
      severity: "error",
      filePath: config.checklistFile,
      message: `Configured release checklist file "${config.checklistFile}" was not found.`,
      remediation: `Create the "${config.checklistFile}" markdown file with required release task items.`
    });
    return results;
  }
  const completed = [];
  const uncompleted = [];
  if (foundFile) {
    const content = context.readFile(foundFile);
    if (content !== null) {
      const taskRegex = /^[ \t]*-[ \t]*\[([ xX])\][ \t]*(.+)$/gm;
      let match;
      while ((match = taskRegex.exec(content)) !== null) {
        const isChecked = (match[1] ?? "").toLowerCase() === "x";
        const taskText = (match[2] ?? "").trim();
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
          id: "CHK-EMPTY",
          category: "checklist",
          name: "Release Checklist Verification",
          status: "warn",
          severity: "warning",
          filePath: foundFile,
          message: `Checklist file "${foundFile}" does not contain any Markdown task items (- [ ] / - [x]).`,
          remediation: "Add markdown task items to track release verification steps."
        });
      } else if (uncompleted.length > 0 && config.requireAllCompleted) {
        const pendingList = uncompleted.map((u) => `Line ${u.line}: ${u.task}`).join("; ");
        results.push({
          id: "CHK-PENDING-TASKS",
          category: "checklist",
          name: "Incomplete Release Checklist",
          status: "fail",
          severity: "error",
          filePath: foundFile,
          message: `${uncompleted.length} of ${totalTasks} release checklist tasks are not completed in "${foundFile}". Pending tasks: ${pendingList}`,
          remediation: `Review "${foundFile}" and complete all remaining release checklist items before proceeding.`,
          details: {
            totalTasks,
            completedCount: completed.length,
            pendingTasks: uncompleted
          }
        });
      } else {
        results.push({
          id: "CHK-ALL-COMPLETED",
          category: "checklist",
          name: "Release Checklist Verification",
          status: "pass",
          severity: "info",
          filePath: foundFile,
          message: `All ${totalTasks} release checklist items in "${foundFile}" are marked complete.`
        });
      }
    }
  }
  if (config.requiredItems.length > 0) {
    for (const item of config.requiredItems) {
      const id = `CHK-REQ-ITEM-${item.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const name = `Required Checklist Item: ${item}`;
      if (!foundFile) {
        results.push({
          id,
          category: "checklist",
          name,
          status: "fail",
          severity: "error",
          message: `Required checklist item "${item}" could not be verified because no release checklist file was found.`,
          remediation: `Create a RELEASE_CHECKLIST.md file containing a completed task item for "${item}".`
        });
        continue;
      }
      const normalizedItem = item.toLowerCase();
      const isCompleted = completed.some((t) => t.toLowerCase().includes(normalizedItem));
      if (isCompleted) {
        results.push({
          id,
          category: "checklist",
          name,
          status: "pass",
          severity: "info",
          filePath: foundFile,
          message: `Required release checklist item "${item}" is marked complete in "${foundFile}".`
        });
        continue;
      }
      const matchedUncompleted = uncompleted.find(
        (u) => u.task.toLowerCase().includes(normalizedItem)
      );
      if (matchedUncompleted) {
        results.push({
          id,
          category: "checklist",
          name,
          status: "fail",
          severity: "error",
          filePath: foundFile,
          line: matchedUncompleted.line,
          message: `Required checklist item "${item}" is present on line ${matchedUncompleted.line} of "${foundFile}" but is not marked complete.`,
          remediation: `Complete the "${item}" item (- [x]) in "${foundFile}".`
        });
        continue;
      }
      results.push({
        id,
        category: "checklist",
        name,
        status: "fail",
        severity: "error",
        filePath: foundFile,
        message: `Required checklist item "${item}" was not found in "${foundFile}".`,
        remediation: `Add and complete a task item matching "${item}" in "${foundFile}".`
      });
    }
  }
  return results;
}

// src/checks/custom.ts
function runCustomRules(context, rules) {
  const results = [];
  for (const rule of rules) {
    const exists = context.hasFile(rule.file);
    if (rule.mustExist !== void 0) {
      if (rule.mustExist && !exists) {
        results.push({
          id: rule.id,
          category: "custom",
          name: rule.name,
          status: "fail",
          severity: rule.severity,
          filePath: rule.file,
          message: rule.message || `Custom rule "${rule.name}" failed: file "${rule.file}" must exist.`,
          remediation: `Create or restore "${rule.file}".`
        });
        continue;
      } else if (!rule.mustExist && exists) {
        results.push({
          id: rule.id,
          category: "custom",
          name: rule.name,
          status: "fail",
          severity: rule.severity,
          filePath: rule.file,
          message: rule.message || `Custom rule "${rule.name}" failed: file "${rule.file}" must not exist.`,
          remediation: `Remove "${rule.file}" from the repository.`
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
      let regex;
      try {
        regex = new RegExp(rule.pattern);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          id: rule.id,
          category: "custom",
          name: rule.name,
          status: "fail",
          severity: "error",
          filePath: rule.file,
          message: `Custom rule "${rule.name}" has invalid regex pattern "/${rule.pattern}/": ${msg}`,
          remediation: `Fix the regular expression syntax in custom rule "${rule.id}".`
        });
        continue;
      }
      if (!regex.test(content)) {
        results.push({
          id: rule.id,
          category: "custom",
          name: rule.name,
          status: "fail",
          severity: rule.severity,
          filePath: rule.file,
          message: rule.message || `Custom rule "${rule.name}" failed: expected pattern "/${rule.pattern}/" not found in "${rule.file}".`,
          remediation: `Update "${rule.file}" to include the required pattern.`
        });
        continue;
      }
    }
    if (rule.forbiddenPattern) {
      let regex;
      try {
        regex = new RegExp(rule.forbiddenPattern);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          id: rule.id,
          category: "custom",
          name: rule.name,
          status: "fail",
          severity: "error",
          filePath: rule.file,
          message: `Custom rule "${rule.name}" has invalid forbiddenPattern "/${rule.forbiddenPattern}/": ${msg}`,
          remediation: `Fix the regular expression syntax in custom rule "${rule.id}".`
        });
        continue;
      }
      const match = regex.exec(content);
      if (match) {
        const loc = getLocationFromIndex(content, match.index);
        results.push({
          id: rule.id,
          category: "custom",
          name: rule.name,
          status: "fail",
          severity: rule.severity,
          filePath: rule.file,
          line: loc.line,
          column: loc.column,
          message: rule.message || `Custom rule "${rule.name}" failed: forbidden pattern "/${rule.forbiddenPattern}/" matched on line ${loc.line}.`,
          remediation: `Remove or replace the forbidden pattern in "${rule.file}".`
        });
        continue;
      }
    }
    results.push({
      id: rule.id,
      category: "custom",
      name: rule.name,
      status: "pass",
      severity: "info",
      filePath: rule.file,
      message: `Custom rule "${rule.name}" passed.`
    });
  }
  return results;
}

// src/core/engine.ts
var ReleaseReadinessEngine = class {
  config;
  constructor(config) {
    this.config = config;
  }
  async evaluate(options) {
    const startTime = Date.now();
    const collector = new FileCollector({
      workingDirectory: this.config.workingDirectory,
      excludePatterns: this.config.secrets.excludePaths,
      maxFileSizeKb: this.config.secrets.maxFileSizeKb
    });
    const context = options?.customContext || collector.createContext();
    const allResults = [];
    allResults.push(...runStructureChecks(context, this.config.structure));
    allResults.push(...runDocumentationChecks(context, this.config.documentation));
    const pkgResults = await runPackageChecks(context, this.config.packageMetadata);
    allResults.push(...pkgResults);
    const scriptResults = await runScriptChecks(context, this.config.scripts);
    allResults.push(...scriptResults);
    const untrackedFiles = this.config.secrets.enabled && !this.config.secrets.includeUntracked ? await getUntrackedGitFiles(context.workingDirectory) : void 0;
    const secretScanner = new SecretScanner(this.config.secrets);
    allResults.push(...secretScanner.scan(context, { untrackedFiles }));
    const depResults = await runDependencyChecks(context, this.config.dependencies);
    allResults.push(...depResults);
    const gitResults = await runGitChecks(context, this.config.git);
    allResults.push(...gitResults);
    allResults.push(...runChecklistChecks(context, this.config.checklist));
    allResults.push(...runCustomRules(context, this.config.customRules));
    const durationMs = Date.now() - startTime;
    const initialCategorySummary = () => ({
      total: 0,
      passed: 0,
      warnings: 0,
      errors: 0,
      skipped: 0
    });
    const categories = {
      structure: initialCategorySummary(),
      documentation: initialCategorySummary(),
      package: initialCategorySummary(),
      scripts: initialCategorySummary(),
      secrets: initialCategorySummary(),
      dependencies: initialCategorySummary(),
      git: initialCategorySummary(),
      checklist: initialCategorySummary(),
      custom: initialCategorySummary()
    };
    let totalPassed = 0;
    let totalWarnings = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    let hasExposedSecrets = false;
    for (const res of allResults) {
      const cat = categories[res.category];
      cat.total++;
      if (res.status === "pass") {
        cat.passed++;
        totalPassed++;
      } else if (res.status === "skip") {
        cat.skipped++;
        totalSkipped++;
      } else if (res.status === "warn") {
        cat.warnings++;
        totalWarnings++;
      } else if (res.status === "fail") {
        if (res.severity === "warning") {
          cat.warnings++;
          totalWarnings++;
        } else {
          cat.errors++;
          totalErrors++;
        }
        if (res.category === "secrets") {
          hasExposedSecrets = true;
        }
      }
    }
    let passed = true;
    if (this.config.failOnSecrets && hasExposedSecrets) {
      passed = false;
    } else if (this.config.failOn === "error") {
      passed = totalErrors === 0;
    } else if (this.config.failOn === "warning") {
      passed = totalErrors === 0 && totalWarnings === 0;
    } else if (this.config.failOn === "never") {
      passed = !this.config.failOnSecrets || !hasExposedSecrets;
    }
    const summary2 = {
      totalChecks: allResults.length,
      passed: totalPassed,
      warnings: totalWarnings,
      errors: totalErrors,
      skipped: totalSkipped,
      durationMs
    };
    return {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      workingDirectory: this.config.workingDirectory,
      passed,
      failThreshold: this.config.failOn,
      summary: summary2,
      categories,
      results: allResults
    };
  }
};

// src/reporters/markdown-reporter.ts
var STATUS_EMOJIS = {
  pass: "\u2705",
  fail: "\u274C",
  warn: "\u26A0\uFE0F",
  skip: "\u23ED\uFE0F"
};
var CATEGORY_NAMES = {
  structure: "Project Structure",
  documentation: "Documentation",
  package: "Package Metadata",
  scripts: "Scripts & Build",
  secrets: "Secret Scanning",
  dependencies: "Dependencies",
  git: "Git & Artifacts",
  checklist: "Release Checklist",
  custom: "Custom Rules"
};
function formatMarkdownReport(report) {
  const lines = [];
  const overallStatusText = report.passed ? "PASSED" : "FAILED";
  const overallEmoji = report.passed ? "\u2705" : "\u274C";
  lines.push(`# ${overallEmoji} Release Readiness Evaluation: ${overallStatusText}`);
  lines.push("");
  lines.push(
    `> **Evaluated at:** \`${report.timestamp}\` | **Duration:** \`${report.summary.durationMs}ms\` | **Threshold:** \`${report.failThreshold}\``
  );
  lines.push("");
  lines.push("### \u{1F4CA} Summary Overview");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("| :--- | :---: |");
  lines.push(`| **Total Checks** | ${report.summary.totalChecks} |`);
  lines.push(`| **Passed** \u2705 | ${report.summary.passed} |`);
  lines.push(`| **Warnings** \u26A0\uFE0F | ${report.summary.warnings} |`);
  lines.push(`| **Errors** \u274C | ${report.summary.errors} |`);
  lines.push(`| **Skipped** \u23ED\uFE0F | ${report.summary.skipped} |`);
  lines.push("");
  lines.push("### \u{1F4C2} Category Breakdown");
  lines.push("");
  lines.push("| Category | Total | Passed | Warnings | Errors | Status |");
  lines.push("| :--- | :---: | :---: | :---: | :---: | :---: |");
  for (const [catKey, summary2] of Object.entries(report.categories)) {
    if (summary2.total === 0) continue;
    let catStatus = "\u2705 Pass";
    if (summary2.errors > 0) catStatus = "\u274C Fail";
    else if (summary2.warnings > 0) catStatus = "\u26A0\uFE0F Warn";
    else if (summary2.skipped === summary2.total) catStatus = "\u23ED\uFE0F Skip";
    const catName = CATEGORY_NAMES[catKey] || catKey;
    lines.push(
      `| ${catName} | ${summary2.total} | ${summary2.passed} | ${summary2.warnings} | ${summary2.errors} | ${catStatus} |`
    );
  }
  lines.push("");
  const actionableFindings = report.results.filter(
    (r) => r.status === "fail" || r.status === "warn"
  );
  if (actionableFindings.length > 0) {
    lines.push("### \u26A0\uFE0F Actionable Findings");
    lines.push("");
    for (const finding of actionableFindings) {
      const emoji = finding.status === "fail" ? "\u274C" : "\u26A0\uFE0F";
      const fileLoc = finding.filePath ? `\`${finding.filePath}${finding.line ? `:${finding.line}` : ""}\`` : "Project Root";
      lines.push(`#### ${emoji} [${finding.id}] ${finding.name}`);
      lines.push("");
      lines.push(`- **Location:** ${fileLoc}`);
      lines.push(`- **Severity:** \`${finding.severity}\``);
      lines.push(`- **Issue:** ${finding.message}`);
      if (finding.remediation) {
        lines.push(`- **Remediation:** \u{1F4A1} ${finding.remediation}`);
      }
      lines.push("");
    }
  } else {
    lines.push("### \u{1F389} No Blocking Issues Identified");
    lines.push("");
    lines.push("All evaluated criteria satisfied release-readiness requirements.");
    lines.push("");
  }
  lines.push("<details>");
  lines.push(
    "<summary><b>\u{1F50D} View All Evaluated Checks (" + report.results.length + ")</b></summary>"
  );
  lines.push("");
  lines.push("| Check ID | Category | Name | Status | Message |");
  lines.push("| :--- | :--- | :--- | :---: | :--- |");
  for (const res of report.results) {
    const statusEmoji = STATUS_EMOJIS[res.status] || res.status;
    const catName = CATEGORY_NAMES[res.category] || res.category;
    const safeMsg = res.message.replace(/\|/g, "\\|").replace(/\n/g, " ");
    lines.push(`| \`${res.id}\` | ${catName} | ${res.name} | ${statusEmoji} | ${safeMsg} |`);
  }
  lines.push("");
  lines.push("</details>");
  lines.push("");
  return lines.join("\n");
}

// src/reporters/json-reporter.ts
function formatJsonReport(report, space = 2) {
  return JSON.stringify(report, null, space);
}

// src/reporters/terminal-reporter.ts
import pc from "picocolors";
var STATUS_ICONS = {
  pass: pc.green("\u2713 PASS"),
  fail: pc.red("\u2717 FAIL"),
  warn: pc.yellow("\u26A0 WARN"),
  skip: pc.gray("\u25CB SKIP")
};
function formatTerminalReport(report) {
  const lines = [];
  lines.push("");
  lines.push(
    pc.bold(pc.cyan("======================================================================"))
  );
  lines.push(
    pc.bold(
      `  RELEASE READINESS EVALUATION: ${report.passed ? pc.green("PASSED") : pc.red("FAILED")}`
    )
  );
  lines.push(
    pc.bold(pc.cyan("======================================================================"))
  );
  lines.push("");
  lines.push(
    `  Total: ${pc.bold(report.summary.totalChecks)} | Passed: ${pc.green(report.summary.passed)} | Warnings: ${pc.yellow(report.summary.warnings)} | Errors: ${pc.red(report.summary.errors)} | Skipped: ${pc.gray(report.summary.skipped)} | Duration: ${report.summary.durationMs}ms`
  );
  lines.push("");
  const categoriesPresent = Array.from(
    new Set(report.results.map((r) => r.category))
  );
  for (const cat of categoriesPresent) {
    const catResults = report.results.filter((r) => r.category === cat);
    lines.push(pc.bold(pc.underline(`[${cat.toUpperCase()}]`)));
    for (const res of catResults) {
      const badge = STATUS_ICONS[res.status] || res.status;
      const filePart = res.filePath ? pc.dim(` (${res.filePath}${res.line ? `:${res.line}` : ""})`) : "";
      lines.push(`  ${badge} ${pc.bold(res.name)}${filePart}`);
      if (res.status === "fail" || res.status === "warn") {
        lines.push(`         ${pc.dim(res.message)}`);
        if (res.remediation) {
          lines.push(`         ${pc.cyan("Remediation:")} ${res.remediation}`);
        }
      }
    }
    lines.push("");
  }
  lines.push(
    pc.bold(pc.cyan("----------------------------------------------------------------------"))
  );
  if (report.passed) {
    lines.push(pc.green(pc.bold("  \u2713 All release-readiness requirements satisfied!")));
  } else {
    lines.push(
      pc.red(pc.bold(`  \u2717 Release blocked: ${report.summary.errors} error(s) must be resolved.`))
    );
  }
  lines.push(
    pc.bold(pc.cyan("----------------------------------------------------------------------"))
  );
  lines.push("");
  return lines.join("\n");
}

// src/reporters/github-summary.ts
import * as core from "@actions/core";
async function writeGitHubSummaryAndAnnotations(report, options = {}) {
  const { createSummary = true, annotateGitHub = true } = options;
  if (createSummary) {
    const markdown = formatMarkdownReport(report);
    try {
      await core.summary.addRaw(markdown).write();
    } catch {
    }
  }
  if (annotateGitHub) {
    for (const finding of report.results) {
      if (finding.status === "fail" || finding.status === "warn") {
        const annotationProperties = {
          title: `[${finding.id}] ${finding.name}`,
          file: finding.filePath || void 0,
          startLine: finding.line || void 0,
          startColumn: finding.column || void 0
        };
        const messageText = finding.remediation ? `${finding.message}
Remediation: ${finding.remediation}` : finding.message;
        if (finding.severity === "error") {
          core.error(messageText, annotationProperties);
        } else if (finding.severity === "warning" || finding.status === "warn") {
          core.warning(messageText, annotationProperties);
        } else {
          core.notice(messageText, annotationProperties);
        }
      }
    }
  }
}
export {
  CustomRuleSchema,
  DEFAULT_CONFIG,
  FileCollector,
  PACKAGE_VERSION,
  ReleaseReadinessConfigSchema,
  ReleaseReadinessEngine,
  RequiredDocSchema,
  ScriptCommandSchema,
  SecretPatternSchema,
  SecretScanner,
  deepMerge,
  executeSubprocess,
  formatJsonReport,
  formatMarkdownReport,
  formatTerminalReport,
  getCurrentGitBranch,
  getCurrentGitTag,
  getGitStatus,
  getLocationFromIndex,
  getUntrackedGitFiles,
  isGitRepo,
  isPathInside,
  loadConfig,
  maskSensitiveKeyValue,
  matchesPattern,
  normalizeRelativePath,
  redactEvidence,
  redactSecret,
  truncateText,
  writeGitHubSummaryAndAnnotations
};
