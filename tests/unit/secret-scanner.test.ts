import { describe, it, expect } from 'vitest';
import { SecretScanner } from '../../src/scanners/secret-scanner.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';
import type { EngineContext, CollectedFile } from '../../src/types/index.js';

function createMockContext(files: Record<string, string>): EngineContext {
  const collected: CollectedFile[] = Object.keys(files).map((path) => ({
    relativePath: path,
    absolutePath: `/mock/${path}`,
    sizeBytes: Buffer.byteLength(files[path] || '', 'utf-8'),
    extension: path.includes('.') ? `.${path.split('.').pop()}` : '',
  }));

  return {
    workingDirectory: '/mock',
    files: collected,
    hasFile: (p) => Boolean(files[p]),
    readFile: (p) => files[p] ?? null,
    readJson: <T>(p: string) => {
      try {
        return files[p] ? (JSON.parse(files[p]!) as T) : null;
      } catch {
        return null;
      }
    },
    getFileSize: (p) => (files[p] ? Buffer.byteLength(files[p]!, 'utf-8') : null),
  };
}

describe('Secret Scanner', () => {
  const scanner = new SecretScanner(DEFAULT_CONFIG.secrets);

  describe('Positive Detections (Synthetic Credentials)', () => {
    it('detects private key blocks', () => {
      const mockContext = createMockContext({
        'src/crypto.ts': `
const key = \`-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0syntheticKeyContentForTestingPurposesOnly1234567890
-----END RSA PRIVATE KEY-----\`;
`,
      });

      const findings = scanner.scan(mockContext);
      const pkFinding = findings.find((f) => f.id === 'SEC-PK-01');

      expect(pkFinding).toBeDefined();
      expect(pkFinding?.status).toBe('fail');
      expect(pkFinding?.filePath).toBe('src/crypto.ts');
      expect(pkFinding?.message).toContain('Redacted value');
      // Verify raw key is never exposed
      expect(pkFinding?.message).not.toContain('syntheticKeyContentForTestingPurposesOnly');
    });

    it('detects AWS Access Key ID', () => {
      // Synthetic test key following AWS format (AKIA + 16 uppercase/numbers)
      const syntheticKey = 'AKIAIOSFODNN7EXAMPLE';
      const mockContext = createMockContext({
        'src/aws.ts': `const awsAccessKey = "${syntheticKey}";`,
      });

      const findings = scanner.scan(mockContext);
      const awsFinding = findings.find((f) => f.id === 'SEC-AWS-01');

      expect(awsFinding).toBeDefined();
      expect(awsFinding?.status).toBe('fail');
      expect(awsFinding?.filePath).toBe('src/aws.ts');
      expect(awsFinding?.message).not.toContain('IOSFODNN7EXAM');
    });

    it('detects GitHub Personal Access Tokens (ghp_)', () => {
      // Synthetic GitHub token format
      const syntheticToken = 'ghp_1234567890abcdefghijklmnopqrstuvwxyzAB';
      const mockContext = createMockContext({
        'src/github.ts': `const token = "${syntheticToken}";`,
      });

      const findings = scanner.scan(mockContext);
      const ghFinding = findings.find((f) => f.id === 'SEC-GH-01');

      expect(ghFinding).toBeDefined();
      expect(ghFinding?.status).toBe('fail');
      expect(ghFinding?.message).not.toContain('1234567890abcdef');
    });

    it('detects Slack tokens and webhooks', () => {
      const slackToken = ['xoxb', '1234567890', '1234567890123', 'abcdefghijklmnopqrstuvwx'].join('-');
      const slackWebhook = ['https:', '', 'hooks.slack.com', 'services', 'T12345678', 'B123456789', '1234567890abcdef12345678'].join('/');
      const mockContext = createMockContext({
        'src/notifications.ts': `
    const slackBot = "${slackToken}";
    const webhook = "${slackWebhook}";
`,
      });

      const findings = scanner.scan(mockContext);
      expect(findings.some((f) => f.id === 'SEC-SLACK-01')).toBe(true);
      expect(findings.some((f) => f.id === 'SEC-SLACK-02')).toBe(true);
    });

    it('detects Stripe secret keys', () => {
      const stripeKey = ['sk', 'live', '51AbcdefghijklmnopqrstuvwxyzA'].join('_');
      const mockContext = createMockContext({
        'src/payments.ts': `const stripeSecret = "${stripeKey}";`,
      });

      const findings = scanner.scan(mockContext);
      expect(findings.some((f) => f.id === 'SEC-STRIPE-01')).toBe(true);
    });

    it('detects OpenAI API keys', () => {
      const mockContext = createMockContext({
        'src/ai.ts': `const openaiKey = "sk-abcdefghijklmnopqrstuvwxyz1234567890";`,
      });

      const findings = scanner.scan(mockContext);
      expect(findings.some((f) => f.id === 'SEC-OPENAI-01')).toBe(true);
    });

    it('detects Database connection strings with embedded credentials', () => {
      const mockContext = createMockContext({
        'src/db.ts': `const dbUri = "postgres://admin_user:super_secret_pw123@db.example.com:5432/production";`,
      });

      const findings = scanner.scan(mockContext);
      const dbFinding = findings.find((f) => f.id === 'SEC-DB-01');

      expect(dbFinding).toBeDefined();
      expect(dbFinding?.status).toBe('fail');
    });

    it('detects sensitive committed environment files (.env)', () => {
      const mockContext = createMockContext({
        '.env': 'DATABASE_URL=postgres://user:pass@localhost:5432/mydb\nSECRET_KEY=12345678\n',
      });

      const findings = scanner.scan(mockContext);
      const envFinding = findings.find((f) => f.id === 'SEC-ENV-01');

      expect(envFinding).toBeDefined();
      expect(envFinding?.status).toBe('fail');
      expect(envFinding?.filePath).toBe('.env');
    });
  });

  describe('Negative Detections & False Positive Resistance', () => {
    it('ignores standard placeholders and example keys', () => {
      const mockContext = createMockContext({
        'src/config.ts': `
const apiKey = "your_api_key_here";
const token = "change_me";
const dummy = "placeholder";
const sample = "000000000000000000000000";
`,
      });

      const findings = scanner.scan(mockContext);
      expect(findings.filter((f) => f.status === 'fail')).toHaveLength(0);
      expect(findings.some((f) => f.id === 'SEC-PASS-01')).toBe(true);
    });

    it('ignores .example and .template configuration files', () => {
      const exampleSlackToken = ['xoxb', '1234567890', '1234567890123', 'abcdefghijklmnopqrstuvwx'].join('-');
      const mockContext = createMockContext({
        '.env.example':
          `API_KEY=AKIAIOSFODNN7EXAMPLE\nSECRET=ghp_1234567890abcdefghijklmnopqrstuvwxyzAB\nSLACK_TOKEN=${exampleSlackToken}\n`,
        'config.template.json': JSON.stringify({ token: exampleSlackToken }),
      });

      const findings = scanner.scan(mockContext);
      expect(findings.filter((f) => f.status === 'fail')).toHaveLength(0);
    });

    it('does not flag normal code keywords containing the word secret', () => {
      const mockContext = createMockContext({
        'src/service.ts': `
export interface SecretOptions {
  secretName: string;
  isSecret: boolean;
}
export function getSecret(name: string) {
  return process.env[name];
}
`,
      });

      const findings = scanner.scan(mockContext);
      expect(findings.filter((f) => f.status === 'fail')).toHaveLength(0);
    });
  });
});
