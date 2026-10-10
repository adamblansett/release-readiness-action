/**
 * Secret redaction utilities to ensure sensitive credentials are never disclosed
 * in reports, logs, console output, or GitHub step summaries.
 */
export declare function redactSecret(secret: string): string;
/**
 * Redacts occurrences of sensitive secrets within an evidence snippet or log line.
 */
export declare function redactEvidence(evidence: string, matchedSecrets: string[]): string;
/**
 * Standard generic patterns for masking in strings when secret is matched.
 */
export declare function maskSensitiveKeyValue(key: string, value: string): string;
//# sourceMappingURL=redaction.d.ts.map