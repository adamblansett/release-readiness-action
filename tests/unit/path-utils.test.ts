import { describe, it, expect } from 'vitest';
import { isPathInside, normalizeRelativePath, matchesPattern } from '../../src/utils/path-utils.js';

describe('Path Utilities', () => {
  describe('isPathInside', () => {
    it('returns true when child path is inside parent directory', () => {
      expect(isPathInside('/home/user/project', '/home/user/project/src/index.ts')).toBe(true);
      expect(isPathInside('/home/user/project', '/home/user/project/README.md')).toBe(true);
    });

    it('returns false when child attempts directory traversal', () => {
      expect(isPathInside('/home/user/project', '/home/user/project/../../etc/passwd')).toBe(false);
      expect(isPathInside('/home/user/project', '/var/log/syslog')).toBe(false);
    });
  });

  describe('normalizeRelativePath', () => {
    it('removes leading ./', () => {
      expect(normalizeRelativePath('./src/index.ts')).toBe('src/index.ts');
    });

    it('normalizes backslashes to forward slashes', () => {
      expect(normalizeRelativePath('src\\utils\\path.ts')).toBe('src/utils/path.ts');
    });
  });

  describe('matchesPattern', () => {
    it('matches exact paths', () => {
      expect(matchesPattern('README.md', 'README.md')).toBe(true);
      expect(matchesPattern('src/index.ts', 'src/index.ts')).toBe(true);
      expect(matchesPattern('src/index.ts', 'src/cli.ts')).toBe(false);
    });

    it('matches directory wildcards (e.g. node_modules/**)', () => {
      expect(matchesPattern('node_modules/pkg/index.js', 'node_modules/**')).toBe(true);
      expect(matchesPattern('node_modules', 'node_modules/**')).toBe(true);
      expect(matchesPattern('src/node_modules/file.js', 'node_modules/**')).toBe(false);
    });

    it('matches extension wildcards (e.g. *.png, **/*.png)', () => {
      expect(matchesPattern('assets/logo.png', '*.png')).toBe(true);
      expect(matchesPattern('logo.png', '*.png')).toBe(true);
      expect(matchesPattern('logo.jpg', '*.png')).toBe(false);
    });
  });
});
