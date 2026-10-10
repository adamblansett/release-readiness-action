import { readdirSync, statSync, readFileSync, realpathSync, existsSync } from 'node:fs';
import { join, extname, relative, resolve } from 'node:path';
import type { CollectedFile, EngineContext } from '../types/index.js';
import { isPathInside, matchesPattern, normalizeRelativePath } from '../utils/path-utils.js';

export interface FileCollectorOptions {
  workingDirectory: string;
  excludePatterns?: string[];
  maxFileSizeKb?: number;
}

export class FileCollector {
  private readonly workingDirectory: string;
  private readonly excludePatterns: string[];
  private readonly maxFileSizeKb: number;

  constructor(options: FileCollectorOptions) {
    this.workingDirectory = resolve(options.workingDirectory);
    this.excludePatterns = options.excludePatterns || [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**',
      'coverage/**',
      '*.lock',
      'package-lock.json',
      '*.png',
      '*.jpg',
      '*.jpeg',
      '*.gif',
      '*.svg',
      '*.ico',
      '*.pdf',
      '*.woff',
      '*.woff2',
      '*.ttf',
      '*.eot',
    ];
    this.maxFileSizeKb = options.maxFileSizeKb || 512;
  }

  public getMaxFileSizeKb(): number {
    return this.maxFileSizeKb;
  }

  /**
   * Collects all eligible files within the working directory.
   */
  public collect(): CollectedFile[] {
    const files: CollectedFile[] = [];
    const visitedRealPaths = new Set<string>();

    const walk = (currentDir: string) => {
      let entries: string[];
      try {
        entries = readdirSync(currentDir);
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const relPath = normalizeRelativePath(relative(this.workingDirectory, fullPath));

        // Check exclusions against relative path
        if (this.isExcluded(relPath)) {
          continue;
        }

        let stat;
        let realPath: string;
        try {
          stat = statSync(fullPath);
          realPath = realpathSync(fullPath);
        } catch {
          continue;
        }

        // Prevent symlink loops and directory escape
        if (!isPathInside(this.workingDirectory, realPath)) {
          continue;
        }

        if (visitedRealPaths.has(realPath)) {
          continue;
        }
        visitedRealPaths.add(realPath);

        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (stat.isFile()) {
          const ext = extname(entry).toLowerCase();
          files.push({
            relativePath: relPath,
            absolutePath: fullPath,
            sizeBytes: stat.size,
            extension: ext,
          });
        }
      }
    };

    walk(this.workingDirectory);
    return files;
  }

  public isExcluded(relPath: string): boolean {
    for (const pattern of this.excludePatterns) {
      if (matchesPattern(relPath, pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Creates an EngineContext for checks to safely read files.
   */
  public createContext(collectedFiles?: CollectedFile[]): EngineContext {
    const files = collectedFiles || this.collect();
    const fileMap = new Map<string, CollectedFile>();
    for (const f of files) {
      fileMap.set(normalizeRelativePath(f.relativePath), f);
    }

    return {
      workingDirectory: this.workingDirectory,
      files,
      hasFile: (relPath: string) => {
        const normalized = normalizeRelativePath(relPath);
        if (fileMap.has(normalized)) return true;
        const abs = resolve(this.workingDirectory, normalized);
        return isPathInside(this.workingDirectory, abs) && existsSync(abs);
      },
      readFile: (relPath: string) => {
        const normalized = normalizeRelativePath(relPath);
        const abs = resolve(this.workingDirectory, normalized);
        if (!isPathInside(this.workingDirectory, abs) || !existsSync(abs)) {
          return null;
        }
        try {
          return readFileSync(abs, 'utf-8');
        } catch {
          return null;
        }
      },
      readJson: <T = unknown>(relPath: string): T | null => {
        const normalized = normalizeRelativePath(relPath);
        const abs = resolve(this.workingDirectory, normalized);
        if (!isPathInside(this.workingDirectory, abs) || !existsSync(abs)) {
          return null;
        }
        try {
          const content = readFileSync(abs, 'utf-8');
          return JSON.parse(content) as T;
        } catch {
          return null;
        }
      },
      getFileSize: (relPath: string) => {
        const normalized = normalizeRelativePath(relPath);
        const file = fileMap.get(normalized);
        if (file) return file.sizeBytes;
        const abs = resolve(this.workingDirectory, normalized);
        if (!isPathInside(this.workingDirectory, abs) || !existsSync(abs)) {
          return null;
        }
        try {
          return statSync(abs).size;
        } catch {
          return null;
        }
      },
    };
  }
}
