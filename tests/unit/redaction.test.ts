import { describe, it, expect } from 'vitest';
import { redactSecret, redactEvidence, maskSensitiveKeyValue } from '../../src/utils/redaction.js';

describe('Redaction Utilities', () => {
  describe('redactSecret', () => {
    it('returns empty string for empty input', () => {
      expect(redactSecret('')).toBe('');
    });

    it('masks short strings of length <= 6 entirely with asterisks', () => {
      expect(redactSecret('abc')).toBe('******');
      expect(redactSecret('123456')).toBe('******');
    });

    it('masks medium strings (7-12 chars) preserving first 2 and last 2 characters', () => {
      const result = redactSecret('12345678');
      expect(result).toBe('12****78');
    });

    it('masks long tokens preserving prefix and suffix', () => {
      const awsKey = 'AKIAIOSFODNN7EXAMPLE';
      const redacted = redactSecret(awsKey);
      expect(redacted).toBe('AKIA****...****PLE');
      expect(redacted).not.toContain('IOSFODNN7EXAM');
    });

    it('masks GitHub PATs correctly', () => {
      const ghp = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      const redacted = redactSecret(ghp);
      expect(redacted.startsWith('ghp_')).toBe(true);
      expect(redacted.endsWith('xyz')).toBe(true);
      expect(redacted).not.toContain('1234567890abcdef');
    });
  });

  describe('redactEvidence', () => {
    it('redacts matched secrets from an evidence line', () => {
      const secret = 'AKIAIOSFODNN7EXAMPLE';
      const line = `const awsKey = "${secret}"; // AWS credential`;
      const sanitized = redactEvidence(line, [secret]);

      expect(sanitized).not.toContain(secret);
      expect(sanitized).toContain('AKIA****...****PLE');
      expect(sanitized).toContain('// AWS credential');
    });

    it('handles multiple distinct secrets in the same snippet', () => {
      const secret1 = 'AKIAIOSFODNN7EXAMPLE';
      const secret2 = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      const snippet = `key1 = "${secret1}" and key2 = "${secret2}"`;
      const sanitized = redactEvidence(snippet, [secret1, secret2]);

      expect(sanitized).not.toContain(secret1);
      expect(sanitized).not.toContain(secret2);
    });

    it('ignores empty or very short strings in secret list', () => {
      const line = 'normal code without secret';
      expect(redactEvidence(line, ['', 'a', 'ab'])).toBe(line);
    });
  });

  describe('maskSensitiveKeyValue', () => {
    it('masks value when key contains sensitive words', () => {
      expect(maskSensitiveKeyValue('password', 'SuperSecretPass123')).toContain('****');
      expect(maskSensitiveKeyValue('api_key', 'AKIAIOSFODNN7EXAMPLE')).toContain('****');
      expect(maskSensitiveKeyValue('auth_token', 'token_value_here')).toContain('****');
    });

    it('leaves non-sensitive keys untouched', () => {
      expect(maskSensitiveKeyValue('username', 'octocat')).toBe('octocat');
      expect(maskSensitiveKeyValue('port', '8080')).toBe('8080');
    });
  });
});
