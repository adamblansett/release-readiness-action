/**
 * Secret redaction utilities to ensure sensitive credentials are never disclosed
 * in reports, logs, console output, or GitHub step summaries.
 */

export function redactSecret(secret: string): string {
  if (!secret) return '';

  const clean = secret.trim();
  const len = clean.length;

  if (len <= 6) {
    return '******';
  }

  if (len <= 12) {
    return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
  }

  // Preserve prefix (up to 4 chars e.g. "ghp_", "AKIA") and last 3 chars
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-3);
  return `${prefix}****...****${suffix}`;
}

/**
 * Redacts occurrences of sensitive secrets within an evidence snippet or log line.
 */
export function redactEvidence(evidence: string, matchedSecrets: string[]): string {
  let redacted = evidence;
  for (const secret of matchedSecrets) {
    if (!secret || secret.length < 3) continue;
    const masked = redactSecret(secret);
    // Replace all literal occurrences of the secret
    redacted = redacted.split(secret).join(masked);
  }
  return redacted;
}

/**
 * Standard generic patterns for masking in strings when secret is matched.
 */
export function maskSensitiveKeyValue(key: string, value: string): string {
  const sensitiveKeyRegex = /(?:password|secret|token|api_?key|credential|private_?key|auth)/i;
  if (sensitiveKeyRegex.test(key)) {
    return redactSecret(value);
  }
  return value;
}
