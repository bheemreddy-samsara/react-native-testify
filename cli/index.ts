#!/usr/bin/env bun

import { loadConfig } from './config';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  const config = loadConfig();

  switch (command) {
    case 'build': {
      const { runBuild } = await import('./commands/build');
      await runBuild(config, args.slice(1));
      break;
    }

    case 'record': {
      const { runRecord } = await import('./commands/record');
      await runRecord(config, args.slice(1));
      break;
    }

    case 'test': {
      if (args.includes('--parallel') || args.includes('--all')) {
        const { runParallelTest } = await import('./commands/test-parallel');
        await runParallelTest(config, args.slice(1));
      } else {
        const { runTest } = await import('./commands/test');
        await runTest(config, args.slice(1));
      }
      break;
    }

    case 'update': {
      const { runUpdate } = await import('./commands/update');
      await runUpdate(config, args.slice(1));
      break;
    }

    case 'list': {
      const { runList } = await import('./commands/list');
      await runList(config);
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
      console.log('react-native-testify v0.1.0');
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
react-native-testify - Component-level visual regression testing for React Native

Usage:
  testify <command> [options]

Commands:
  init              Initialize testify in current project
  build             Build the app for testing
  record            Record baseline screenshots
  test              Run visual regression tests
  update            Update specific baseline(s)
  list              List registered components

Options:
  --ios             Target iOS simulator
  --android         Target Android emulator
  --all             Target both iOS and Android (parallel)
  --parallel        Run tests in parallel on multiple devices
  --config <path>   Path to config file
  --help, -h        Show this help
  --version, -v     Show version

Examples:
  testify init
  testify record --ios
  testify test --ios
  testify test --all              # Parallel iOS + Android
  testify test --parallel --ios --android
  testify update Button_Primary --ios
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
