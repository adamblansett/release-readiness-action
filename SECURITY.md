# Security Policy

## Reporting Security Issues

We take the security of Release Readiness Action seriously. If you believe you have discovered a vulnerability, please report it responsibly.

**Please do not report security issues via public GitHub issues.**

Instead, please send an email to:
`security@adamblansett.com` (or submit via GitHub Private Vulnerability Reporting).

Include:

- A description of the vulnerability.
- Steps to reproduce or proof-of-concept repository.
- Potential impact and affected versions.

We will acknowledge receipt within 48 hours and provide updates until the issue is addressed.

## Security Design Principles

- **Zero Remote Telemetry:** The action runs 100% locally and never transmits repository code or secrets to third parties.
- **Strict Redaction:** All matched credentials are automatically redacted before reaching logs, summaries, or outputs.
- **Safe Defaults:** Dangerous capabilities such as script execution and network auditing are disabled by default.
