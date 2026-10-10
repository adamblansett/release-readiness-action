# Release Readiness Action

A configurable, language-agnostic GitHub Action and developer CLI that evaluates whether a software project satisfies release-readiness requirements before a release or deployment proceeds.

[![CI & Release Readiness](https://github.com/adamblansett/release-readiness-action/actions/workflows/ci.yml/badge.svg)](https://github.com/adamblansett/release-readiness-action/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-brightgreen.svg)](https://nodejs.org)

---

## 🎯 Overview

Shipping releases without automated quality gates leads to preventable outages, leaked API credentials, missing legal licenses, broken entry points, and deployment rollbacks.

**Release Readiness Action** enforces a comprehensive, automated pre-release evaluation checklist covering:

- **Project Structure:** Required files, directories, open-source licenses, documentation, code ownership, and CI workflow configurations.
- **Documentation Validation:** Detects missing docs, 0-byte or trivial files, and unresolved template placeholders (unfinished tasks, unfilled brackets, etc.).
- **Package Metadata (Node.js & TypeScript):** Validates semver format, package naming, licenses, and verifies that declared entry points (`main`, `module`, `types`, `bin`, `exports`) actually exist on disk after builds.
- **Local Secret Scanning:** Scans repository content for high-risk exposed credentials (AWS access keys, GitHub tokens, Slack tokens, Stripe keys, OpenAI keys, private keys, database credentials) with zero external network transmission and full value redaction.
- **Script & Build Verification:** Verifies required lifecycle scripts are declared, with safe opt-in subprocess execution.
- **Dependency Hygiene:** Checks for committed lockfiles, detects conflicting multi-manager lockfiles, and supports optional vulnerability audits.
- **Git & Release Artifacts:** Verifies clean working trees and enforces tag-to-version alignment during release tag workflows.
- **Release Checklists:** Parses and enforces completed Markdown task items (`- [x]`) in release checklists.

---

## 🚀 Quick Start

### Basic Workflow Usage

Add the action to your `.github/workflows/release-readiness.yml` workflow:

```yaml
name: Release Readiness Gate

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  release:
    types: [published]

jobs:
  readiness-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies & build
        run: |
          npm ci
          npm run build

      - name: Evaluate Release Readiness
        uses: adamblansett/release-readiness-action@v1
        with:
          fail-on: error
          check-secrets: true
          output-format: all
```

---

## ⚙️ Action Inputs & Outputs

### Action Inputs

| Input                | Description                                                               |    Default    | Required |
| :------------------- | :------------------------------------------------------------------------ | :-----------: | :------: |
| `config-path`        | Custom path to configuration file (`.release-readiness.yml` or `.json`)   | Auto-detected |    No    |
| `working-directory`  | Target repository root directory to evaluate                              |      `.`      |    No    |
| `fail-on`            | Minimum severity level to fail the action: `error`, `warning`, or `never` |    `error`    |    No    |
| `fail-on-secrets`    | Whether any detected credential causes immediate failure                  |    `true`     |    No    |
| `execute-scripts`    | Explicit opt-in to execute validation commands                            |    `false`    |    No    |
| `scripts-to-run`     | Comma-separated list of scripts to execute (e.g. `test,lint,build`)       |     `""`      |    No    |
| `check-secrets`      | Enable local repository secret scanning                                   |    `true`     |    No    |
| `check-uncommitted`  | Verify working tree has no uncommitted changes                            |    `false`    |    No    |
| `check-tag-version`  | Verify git tag ref matches package version (e.g. in release workflows)    |    `false`    |    No    |
| `audit-dependencies` | Run dependency vulnerability audit (`npm audit`, requires network)        |    `false`    |    No    |
| `output-format`      | Report output format: `all`, `markdown`, `json`, or `console`             |     `all`     |    No    |
| `create-summary`     | Write GitHub Flavored Markdown summary to GitHub Actions Step Summary     |    `true`     |    No    |
| `annotate-github`    | Emit inline annotations on GitHub Pull Request diffs for findings         |    `true`     |    No    |

### Action Outputs

| Output            | Description                                                              |
| :---------------- | :----------------------------------------------------------------------- |
| `passed`          | Boolean string (`true` or `false`) indicating overall evaluation outcome |
| `findings-count`  | Total count of actionable findings (errors + warnings)                   |
| `errors-count`    | Total count of error findings                                            |
| `warnings-count`  | Total count of warning findings                                          |
| `report-json`     | Full structured JSON evaluation report string                            |
| `report-markdown` | GFM formatted summary of the evaluation report                           |

---

## 🛠️ Configuration File (`.release-readiness.yml`)

Projects can customize checks via `.release-readiness.yml`, `.release-readiness.json`, or a path specified in `config-path`.

```yaml
# .release-readiness.yml
failOn: error
failOnSecrets: true

structure:
  checkReadme: true
  checkLicense: true
  checkChangelog: true
  checkSecurityPolicy: true
  checkContributing: false
  checkCodeowners: false
  checkCiWorkflow: true
  requiredFiles:
    - 'docs/architecture.md'
  requiredDirectories:
    - 'src'

documentation:
  minFileSizeBytes: 20
  disallowPlaceholders: true
  placeholderPatterns:
    - 'TODO'
    - 'FIXME'
    - '[PROJECT NAME]'
    - 'LOREM IPSUM'

packageMetadata:
  enabled: true
  requireName: true
  requireVersion: true
  requireDescription: true
  requireLicense: true
  validateSemver: true
  validateEntryPoints: true
  validateFilesWhitelist: true
  checkTagVersionMatch: false

scripts:
  execute: false # Safe default: requires explicit opt-in
  requiredScripts:
    - test
    - build
  timeoutMs: 60000

secrets:
  enabled: true
  maxFileSizeKb: 512
  excludePaths:
    - 'node_modules/**'
    - 'dist/**'
    - 'build/**'
    - '.git/**'
    - 'coverage/**'
    - 'tests/**'
    - '*.lock'
    - 'package-lock.json'
    - '*.png'
    - '*.jpg'

dependencies:
  checkLockfile: true
  checkMultipleLockfiles: true
  audit: false # Safe default: requires explicit opt-in
  auditLevel: high

git:
  checkUncommitted: false
  checkBranch: false
  allowedBranches:
    - main
    - master
    - 'release/*'

checklist:
  checklistFile: 'RELEASE_CHECKLIST.md'
  requireAllCompleted: true

reporting:
  format: all
  annotateGitHub: true
  createSummary: true
```

---

## 💻 Local Developer CLI

Run release readiness evaluations locally before opening a pull request or pushing tags:

```bash
# Evaluate current working directory using default rules
npx release-readiness-action

# Initialize a starter configuration file
npx release-readiness-action --init

# Evaluate with custom fail threshold
npx release-readiness-action --fail-on warning

# Output JSON report
npx release-readiness-action --json

# Output Markdown summary
npx release-readiness-action --markdown
```

---

## 🔒 Security Architecture & Trust Model

1. **Secure by Default:**
   - Script and command execution is **disabled by default**. Enabling execution requires explicit workflow configuration.
   - Network calls are **disabled by default**. Dependency vulnerability auditing (`npm audit`) is opt-in only.
2. **Local-Only Secret Scanning:**
   - Secret scanning runs 100% locally on the runner. File contents are **never** transmitted to any external endpoint or remote API.
   - All detected credentials are automatically redacted (`AKIA****...****PLE`, `ghp_****...****xyz`) across all logs, summaries, annotations, and outputs.
3. **Safe Subprocess Execution:**
   - Validation scripts execute via argument arrays (`['npm', 'run', 'build']`) rather than shell-concatenated strings.
   - Commands run with bounded output capture (1MB limit) and configurable timeouts to prevent runner memory exhaustion or infinite loops.
   - Environment variables containing tokens are not dumped in diagnostics.
4. **Symlink and Path Containment:**
   - The file collector validates real paths against the repository root using canonical paths, preventing symlink traversal attacks outside the workspace.

---

## 📋 Release Checklist Integration

If your project includes a `RELEASE_CHECKLIST.md` or `.github/release-checklist.md`, the action verifies that all checklist tasks are completed:

```markdown
# Release Checklist

- [x] All unit and integration tests passing
- [x] Documentation updated with new API parameters
- [x] Security audit verified
- [x] Production bundle generated and verified
```

If any item is left uncompleted (`- [ ]`), the action reports an actionable failure indicating the exact file and line number.

---

## 🧪 Development & Testing

```bash
# Install dependencies
npm ci

# Run test suite with Vitest
npm test

# Run linter
npm run lint

# Run type check
npm run typecheck

# Format code
npm run format

# Build bundle and declarations
npm run build

# Run all quality verification gates
npm run verify
```

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
