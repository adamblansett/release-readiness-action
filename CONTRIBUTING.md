# Contributing to Release Readiness Action

Thank you for your interest in contributing to Release Readiness Action!

## Development Setup

1. **Prerequisites:**
   - Node.js >= 20.0.0
   - npm >= 10.0.0

2. **Clone and Install:**

   ```bash
   git clone https://github.com/adamblansett/release-readiness-action.git
   cd release-readiness-action
   npm ci
   ```

3. **Available Scripts:**
   - `npm test`: Run automated Vitest test suite.
   - `npm run lint`: Run ESLint checks.
   - `npm run typecheck`: Run TypeScript compiler checks.
   - `npm run format:check`: Check code formatting with Prettier.
   - `npm run format`: Format code with Prettier.
   - `npm run build`: Build TypeScript declarations and esbuild bundles.
   - `npm run verify`: Execute all linting, typechecking, formatting, tests, and build checks.

## Pull Request Guidelines

- Ensure all new features or bug fixes include corresponding unit or integration tests.
- Maintain high test coverage and verified packaging.
- Ensure all tests pass (`npm test`) and code conforms to linter rules (`npm run lint`).
- Update documentation and CHANGELOG when adding new features or configuration options.
