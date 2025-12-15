import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WatchOptions {
  paths: string[];
  onChange: (changedFile: string) => void;
  debounceMs?: number;
}

export function createWatcher(options: WatchOptions): { close: () => void } {
  const { paths, onChange, debounceMs = 300 } = options;
  const watchers: fs.FSWatcher[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastChange = '';

  for (const watchPath of paths) {
    if (!fs.existsSync(watchPath)) continue;

    const stat = fs.statSync(watchPath);
    const isDir = stat.isDirectory();

    try {
      const watcher = fs.watch(
        watchPath,
        { recursive: isDir },
        (eventType, filename) => {
          if (!filename) return;

          const fullPath = isDir ? path.join(watchPath, filename) : watchPath;

          // Skip non-source files
          if (!isSourceFile(fullPath)) return;

          // Debounce rapid changes
          if (debounceTimer) clearTimeout(debounceTimer);

          debounceTimer = setTimeout(() => {
            if (fullPath !== lastChange) {
              lastChange = fullPath;
              onChange(fullPath);
            }
          }, debounceMs);
        },
      );

      watchers.push(watcher);
    } catch {
      // Ignore watch errors for individual paths
    }
  }

  return {
    close: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      for (const watcher of watchers) {
        watcher.close();
      }
    },
  };
}

function isSourceFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.ts', '.tsx', '.js', '.jsx', '.json'].includes(ext);
}

export function parseWatchArg(args: string[]): boolean {
  return args.includes('--watch') || args.includes('-w');
}
