# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
