import type { CheckResult, EngineContext } from '../types/index.js';
import type { ReleaseReadinessConfig } from '../config/schema.js';
import { getLocationFromIndex } from '../utils/text.js';
import { redactSecret, redactEvidence } from '../utils/redaction.js';

export interface SecretPatternDef {
  id: string;
  name: string;
  regex: RegExp;
  extractValue?: (match: RegExpExecArray) => string;
}

const BUILT_IN_PATTERNS: SecretPatternDef[] = [
  {
    id: 'SEC-PK-01',
    name: 'Private Key Block',
    regex:
      /-----BEGIN (?:RSA |OPENSSH |DSA |EC |PGP |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |OPENSSH |DSA |EC |PGP |ENCRYPTED )?PRIVATE KEY-----/g,
    extractValue: (m) => m[0].slice(0, 32),
  },
  {
    id: 'SEC-AWS-01',
    name: 'AWS Access Key ID',
    regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
    extractValue: (m) => m[0],
  },
  {
    id: 'SEC-AWS-02',
    name: 'AWS Secret Access Key',
    regex: /(?:aws_secret_access_key|aws_secret_key)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    extractValue: (m) => m[1] ?? m[0],
  },
  {
    id: 'SEC-GH-01',
    name: 'GitHub Access Token',
    regex: /\b(?:gh[pousr]_[0-9a-zA-Z]{36,255}|github_pat_[0-9a-zA-Z_]{82})\b/g,
    extractValue: (m) => m[0],
  },
  {
    id: 'SEC-SLACK-01',
    name: 'Slack Token',
    regex: /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/g,
    extractValue: (m) => m[0],
  },
  {
    id: 'SEC-SLACK-02',
    name: 'Slack Webhook URL',
    regex:
      /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Za-z_]{8}\/B[0-9A-Za-z_]{8,12}\/[0-9A-Za-z]{24}/g,
    extractValue: (m) => m[0],
  },
  {
    id: 'SEC-STRIPE-01',
    name: 'Stripe Secret Key',
    regex: /\b(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,34}\b/g,
    extractValue: (m) => m[0],
  },
  {
    id: 'SEC-OPENAI-01',
    name: 'OpenAI API Key',
    regex: /\b(?:sk-[a-zA-Z0-9]{20,48}|sk-proj-[a-zA-Z0-9_-]{48,})\b/g,
    extractValue: (m) => m[0],
  },
  {
    id: 'SEC-GCP-01',
    name: 'Google API Key',
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
    extractValue: (m) => m[0],
  },
  {
    id: 'SEC-NPM-01',
    name: 'npm Access Token',
    regex: /\bnpm_[a-zA-Z0-9]{36}\b/g,
    extractValue: (m) => m[0],
  },
  {
    id: 'SEC-WH-01',
    name: 'Webhook Signing Secret',
    regex: /\bwhsec_[0-9a-zA-Z]{32,}\b/g,
    extractValue: (m) => m[0],
  },
  {
    id: 'SEC-DB-01',
    name: 'Database Connection String with Credentials',
    regex:
      /\b(?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis|amqp):\/\/[^/\s:@]+:[^/\s:@]+@[^/\s]+/gi,
    extractValue: (m) => m[0],
  },
  {
    id: 'SEC-ASSIGN-01',
    name: 'Hardcoded High-Entropy Secret Assignment',
    regex:
      /(?:api[_-]?key|secret[_-]?key|auth[_-]?token|access[_-]?token|client[_-]?secret)\s*[:=]\s*["']([A-Za-z0-9_\-+/]{24,})["']/gi,
    extractValue: (m) => m[1] ?? m[0],
  },
];

const IGNORED_SECRET_PLACEHOLDERS = new Set([
  'your_api_key_here',
  'your_api_key',
  'change_me',
  'changeme',
  'placeholder',
  'example',
  'dummy_key',
  'dummy_token',
  'replace_me',
  'test_secret',
  'fake_secret',
  '000000000000000000000000',
  '123456789012345678901234',
  'xxxxxxxxxxxxxxxxxxxxxxxx',
]);

const SENSITIVE_ENV_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.staging',
  '.env.development.local',
];

export class SecretScanner {
  private readonly config: ReleaseReadinessConfig['secrets'];
  private readonly patterns: SecretPatternDef[];

  constructor(config: ReleaseReadinessConfig['secrets']) {
    this.config = config;
    this.patterns = [...BUILT_IN_PATTERNS];

    // Add any user-configured additional patterns
    for (const add of this.config.additionalPatterns) {
      try {
        this.patterns.push({
          id: `SEC-CUSTOM-${add.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: add.name,
          regex: new RegExp(add.pattern, 'g'),
        });
      } catch {
        // Skip invalid regex pattern
      }
    }
  }

  public scan(context: EngineContext): CheckResult[] {
    const results: CheckResult[] = [];

    if (!this.config.enabled) {
      results.push({
        id: 'SEC000',
        category: 'secrets',
        name: 'Secret Scanning',
        status: 'skip',
        severity: 'info',
        message: 'Secret scanning is disabled in configuration.',
      });
      return results;
    }

    // 1. Check for sensitive committed .env files
    for (const envFile of SENSITIVE_ENV_FILES) {
      if (context.hasFile(envFile)) {
        const content = context.readFile(envFile);
        if (content && content.trim().length > 0) {
          results.push({
            id: 'SEC-ENV-01',
            category: 'secrets',
            name: 'Sensitive Environment File Present',
            status: 'fail',
            severity: 'error',
            message: `Sensitive environment file "${envFile}" is present in repository root. Local environment files containing credentials must never be committed.`,
            filePath: envFile,
            line: 1,
            column: 1,
            remediation: `Remove "${envFile}" from git, add it to .gitignore, and rotate any secrets that were stored in this file.`,
          });
        }
      }
    }

    // 2. Scan collected files
    const maxBytes = this.config.maxFileSizeKb * 1024;

    for (const file of context.files) {
      // Skip files exceeding max size to avoid memory exhaustion
      if (file.sizeBytes > maxBytes) {
        continue;
      }

      // Skip documentation, markdown, and sample/template files
      const isTemplateOrExample =
        file.relativePath.endsWith('.example') ||
        file.relativePath.endsWith('.template') ||
        file.relativePath.endsWith('.sample') ||
        file.relativePath.includes('.template.') ||
        file.relativePath.includes('.example.') ||
        file.relativePath.includes('.sample.');

      if (isTemplateOrExample) {
        continue;
      }

      const content = context.readFile(file.relativePath);
      if (!content) continue;

      for (const pattern of this.patterns) {
        pattern.regex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.regex.exec(content)) !== null) {
          const secretValue = pattern.extractValue ? pattern.extractValue(match) : match[0];
          const lowerVal = secretValue.toLowerCase();

          // Filter known placeholders
          if (
            IGNORED_SECRET_PLACEHOLDERS.has(lowerVal) ||
            lowerVal === 'placeholder' ||
            lowerVal === 'your_api_key_here'
          ) {
            continue;
          }

          const loc = getLocationFromIndex(content, match.index);
          const maskedSecret = redactSecret(secretValue);
          const safeEvidence = redactEvidence(loc.lineSnippet, [secretValue]);

          results.push({
            id: pattern.id,
            category: 'secrets',
            name: `Potential Credential Exposed: ${pattern.name}`,
            status: 'fail',
            severity: 'error',
            message: `Potential credential matching pattern "${pattern.name}" detected in ${file.relativePath}:${loc.line}. Redacted value: ${maskedSecret}.`,
            filePath: file.relativePath,
            line: loc.line,
            column: loc.column,
            remediation:
              'Remove the credential immediately, rotate the key in the service dashboard, and inject it securely via GitHub Actions Secrets or environment variables.',
            details: {
              patternName: pattern.name,
              redactedEvidence: safeEvidence,
            },
          });
        }
      }
    }

    if (results.length === 0) {
      results.push({
        id: 'SEC-PASS-01',
        category: 'secrets',
        name: 'Local Secret Scan',
        status: 'pass',
        severity: 'info',
        message: 'No exposed credentials or sensitive environment files were detected.',
      });
    }

    return results;
  }
}
