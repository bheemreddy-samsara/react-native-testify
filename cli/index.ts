#!/usr/bin/env bun

import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadConfig } from './config';

const packageJson = (() => {
  try {
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      name?: string;
      version?: string;
    };
  } catch {
    return { name: 'react-native-testify', version: 'unknown' };
  }
})();

const cliName = packageJson.name ?? 'react-native-testify';
const cliVersion = packageJson.version ?? 'unknown';

function stripConfigArg(args: string[]): {
  configPath: string | undefined;
  cleanedArgs: string[];
} {
  const cleanedArgs: string[] = [];
  let configPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--config') {
      const next = args[i + 1];
      if (!next || next.startsWith('-')) {
        console.error('Missing value for --config <path>');
        process.exit(1);
      }
      configPath = next;
      i += 1;
      continue;
    }

    if (arg.startsWith('--config=')) {
      const value = arg.slice('--config='.length);
      if (!value) {
        console.error('Missing value for --config=<path>');
        process.exit(1);
      }
      configPath = value;
      continue;
    }

    cleanedArgs.push(arg);
  }

  return { configPath, cleanedArgs };
}

const args = process.argv.slice(2);
const command = args[0];
const { configPath, cleanedArgs } = stripConfigArg(args.slice(1));

async function main() {
  const config = loadConfig(configPath);

  switch (command) {
    case 'build': {
      const { runBuild } = await import('./commands/build');
      await runBuild(config, cleanedArgs);
      break;
    }

    case 'record': {
      const { runRecord } = await import('./commands/record');
      await runRecord(config, cleanedArgs);
      break;
    }

    case 'test': {
      if (cleanedArgs.includes('--parallel') || cleanedArgs.includes('--all')) {
        const { runParallelTest } = await import('./commands/test-parallel');
        await runParallelTest(config, cleanedArgs);
      } else {
        const { runTest } = await import('./commands/test');
        await runTest(config, cleanedArgs);
      }
      break;
    }

    case 'update': {
      const { runUpdate } = await import('./commands/update');
      await runUpdate(config, cleanedArgs);
      break;
    }

    case 'list': {
      const { runList } = await import('./commands/list');
      await runList(config);
      break;
    }

    case 'discover': {
      const { runDiscover } = await import('./commands/discover');
      await runDiscover(config, cleanedArgs);
      break;
    }

    case 'init': {
      const { runInit } = await import('./commands/init');
      await runInit();
      break;
    }

    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;

    case '--version':
    case '-v':
      console.log(`${cliName} v${cliVersion}`);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
${cliName} - Component-level visual regression testing for React Native

Usage:
  testify <command> [options]

Commands:
  init              Initialize testify in current project
  build             Build the app for testing
  record            Record baseline screenshots
  test              Run visual regression tests
  update            Update specific baseline(s)
  list              List registered components
  discover          Discover *.testify.tsx files and generate registry

Options:
  --ios             Target iOS simulator
  --android         Target Android emulator
  --all             Target both iOS and Android (parallel)
  --parallel        Run tests in parallel on multiple devices
  --filter <pattern> Filter components by glob pattern
  --watch, -w       Watch mode - re-run tests on file changes
  --config <path>   Path to config file
  --dry-run         Show what would be generated (discover command)
  --verbose, -v     Show detailed output
  --help, -h        Show this help
  --version         Show version

Examples:
  testify init
  testify record --ios
  testify test --ios
  testify test --all              # Parallel iOS + Android
  testify test --parallel --ios --android
  testify update Button_Primary --ios
  testify test --ios --filter "Button_*"
  testify record --ios --filter "Card_*,Badge_*"
  testify test --ios --filter "!*_Disabled"
  testify test --ios --watch            # Watch mode
  testify discover                # Auto-discover *.testify.tsx files
  testify discover --dry-run      # Preview generated registry

Discovery Mode:
  Enable in testify.config.ts:
    discovery: { enabled: true }
  
  Then create per-component files:
    src/components/Button.testify.tsx
    src/features/Card.testify.tsx
  
  Run 'testify discover' to generate the registry.

Idle Detection:
  By default, screenshots are taken when the JS thread is idle.
  Configure in testify.config.ts:
    idleDetection: {
      enabled: true,      // Use idle detection (default)
      timeoutMs: 5000,    // Max wait time
      debounceMs: 100,    // Stability debounce
    }
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
