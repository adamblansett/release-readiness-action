import * as esbuild from 'esbuild';
import { chmodSync } from 'node:fs';

const esmBanner = `import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);
`;

async function bundle() {
  console.log('Bundling Release Readiness Action with esbuild...');

  // 1. Bundle GitHub Action entry point
  await esbuild.build({
    entryPoints: ['src/action/main.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: 'dist/index.js',
    sourcemap: true,
    minify: false,
    banner: {
      js:
        '// Release Readiness Action - Bundled for GitHub Actions runner (Node 20+)\n' + esmBanner,
    },
  });

  // 2. Bundle Developer CLI entry point
  await esbuild.build({
    entryPoints: ['src/cli/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: 'dist/cli.js',
    sourcemap: true,
    minify: false,
    banner: {
      js: '#!/usr/bin/env node\n// Release Readiness Action CLI\n' + esmBanner,
    },
  });

  try {
    chmodSync('dist/cli.js', 0o755);
  } catch {
    // Ignore
  }

  console.log('Bundle completed successfully!');
}

bundle().catch((err) => {
  console.error('Bundle failed:', err);
  process.exit(1);
});
