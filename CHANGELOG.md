# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-11-19

### Changed

- Migrated GitHub Action runtime (`action.yml`), bundle targets (`scripts/bundle.mjs`), CI workflow, and Node engine constraints to Node.js 24 (`node24`).
- Split build artifacts into dedicated GitHub Action (`dist/action.js`), CLI (`dist/cli.js`), and library (`dist/index.js`) entry points without committing `.map` files.
- Removed config-overriding defaults from `action.yml` inputs so omitted inputs preserve `.release-readiness.yml` / `.release-readiness.json` settings.

### Fixed

- Fixed CLI entry point execution detection across Windows paths, `npx`, and symlinks, synchronized CLI `--version` with package version, and honored config file `failOn` when `--fail-on` is omitted.
- Fixed GitHub Action input overrides so `scripts.commands` configured in files is no longer cleared when `scripts-to-run` is omitted, and added strict validation for `fail-on` and `output-format`.
- Wired `reporting.format`, `reporting.summaryFile`, and `reporting.jsonOutputFile` in the GitHub Action runner with path-containment validation.
- Fixed `checklist.requiredItems` verification to check completion in the parsed checklist rather than passing unconditionally.
- Fixed documentation placeholder matching for bracketed patterns (such as `[PROJECT NAME]` and `<INSERT`), preserved exact line numbers after fenced code blocks, and enforced `requiredDocs[].minSize` and `requiredDocs[].title`.
- Implemented `structure.checkReleaseNotes` and `secrets.includeUntracked` (`false` excludes untracked non-ignored Git files).
- Emitted `core.warning` instead of `core.error` PR annotations for `warning`-severity failed checks, and guarded invalid regexes in custom rules.
- Hardened Windows subprocess execution for `npm`/`npx`, stopped forcing `NODE_ENV=test` on user scripts, and handled cross-drive/prefix paths in `isPathInside`.

## [1.0.1] - 2026-11-18

### Security & Hardening

- Hardened Zod configuration schemas with bounded limits on string and array collection lengths to prevent memory exhaustion and collection expansion denial-of-service.
- Pinned secure dependency overrides (`@fastify/busboy`, `picomatch`, `tinypool`, `minimatch`, `glob`, `undici`) to remediate security advisories.
- Enforced automated verification with Vitest suite (75 tests passing) and code style standards.

## [1.0.0] - 2026-10-10

### Added

- Complete Release Readiness GitHub Action bundled for Node 20 runtime (`node20`).
- Local developer CLI tool (`release-readiness`).
- Modular check system:
  - Project structure checks (README, LICENSE, CHANGELOG, Security policy, Contributing, Codeowners, CI workflows).
  - Documentation content validator (detects empty files and template placeholders).
  - Node.js & TypeScript package metadata checks (semver validation, package naming, licenses, build entry points existence on disk).
  - Local repository secret scanner covering private keys, AWS, GitHub, Slack, Stripe, OpenAI, Google credentials, and committed sensitive `.env` files.
  - Script & build validation with safe argument-array subprocess runner, configurable timeouts, and output bounds.
  - Dependency metadata checks (lockfiles, multi-manager conflicts, opt-in `npm audit`).
  - Git working tree hygiene and tag-version matching checks.
  - Release checklist validator parsing Markdown `- [ ]` tasks.
  - User-defined custom pattern rules.
- Dual reporting system:
  - Terminal output with colored status badges.
  - GitHub Flavored Markdown Step Summary tables and collapsible details.
  - GitHub inline PR annotations for warnings and errors.
  - Machine-readable JSON output.
- Comprehensive automated test suite with Vitest and ESLint flat configuration.
- Packaged standalone bundle (`dist/index.js` and `dist/cli.js`) using esbuild.
