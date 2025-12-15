import * as fs from 'node:fs';
import * as path from 'node:path';
import { type CompareResult, compareImages } from '../compare';
import type { TestifyConfig } from '../config';
import {
  cleanupStatusBar,
  launchSimulator,
  takeScreenshot,
} from '../device/ios';
import { filterComponents, parseFilterArg } from '../filter';
import {
  type TestResult as ReportTestResult,
  generateHtmlReport,
} from '../report';
import { createServer } from '../server';
import { createWatcher, parseWatchArg } from '../watcher';

interface TestResult {
  component: string;
  passed: boolean;
  diffPercentage?: number;
  error?: string;
  baselinePath?: string;
  latestPath?: string;
  diffPath?: string;
}

interface TestServer {
  getComponentList(): Promise<string[]>;
  mountComponent(name: string): Promise<void>;
  unmountComponent(): Promise<void>;
}

async function runTestCycle(
  config: TestifyConfig,
  platform: 'ios' | 'android',
  components: string[],
  server: TestServer,
  baselineDir: string,
  diffDir: string,
  latestDir: string,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const bundleId =
    platform === 'ios' ? config.ios.bundleId : config.android.packageName;

  for (const component of components) {
    // Sanitize component name for filename (replace / with -)
    const safeFilename = component.replace(/\//g, '-');
    const baselinePath = path.join(baselineDir, `${safeFilename}.png`);
    const latestPath = path.join(latestDir, `${safeFilename}.png`);
    const diffPath = path.join(diffDir, `${safeFilename}.png`);

    if (!fs.existsSync(baselinePath)) {
      results.push({
        component,
        passed: false,
        error: 'No baseline found. Run `testify record` first.',
        baselinePath,
        latestPath,
        diffPath,
      });
      console.log(`  ✗ ${component} - No baseline`);
      continue;
    }

    let compareResult: CompareResult | null = null;
    let lastError: string | null = null;

    for (let attempt = 0; attempt <= config.retryCount; attempt++) {
      try {
        await server.mountComponent(component);
        await new Promise((r) => setTimeout(r, config.defaultWaitMs));
        await takeScreenshot(platform, latestPath, bundleId);
        await server.unmountComponent();

        compareResult = await compareImages(
          baselinePath,
          latestPath,
          diffPath,
          config.threshold,
        );
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < config.retryCount) {
          await new Promise((r) => setTimeout(r, config.retryDelayMs));
        }
      }
    }

    if (!compareResult) {
      results.push({
        component,
        passed: false,
        error: lastError || 'Unknown error',
        baselinePath,
        latestPath,
        diffPath,
      });
      console.log(`  ✗ ${component} - ${lastError}`);
      continue;
    }

    if (compareResult.match) {
      results.push({
        component,
        passed: true,
        diffPercentage: 0,
        baselinePath,
        latestPath,
      });
      console.log(`  ✓ ${component}`);
      if (fs.existsSync(diffPath)) fs.unlinkSync(diffPath);
    } else {
      results.push({
        component,
        passed: false,
        diffPercentage: compareResult.diffPercentage,
        baselinePath,
        latestPath,
        diffPath,
      });
      console.log(
        `  ✗ ${component} - ${(compareResult.diffPercentage * 100).toFixed(2)}% diff`,
      );
    }
  }

  return results;
}

function printSummary(
  results: TestResult[],
  platform: 'ios' | 'android',
  config: TestifyConfig,
  diffDir: string,
): boolean {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  const reportResults: ReportTestResult[] = results.map((r) => ({
    ...r,
    platform,
  }));

  const reportPath = generateHtmlReport({
    outputDir: config.baselines,
    results: reportResults,
    threshold: config.threshold,
  });

  console.log(`\nReport: file://${reportPath}`);

  if (failed > 0) {
    console.log(`Diff images saved to: ${diffDir}`);
  }

  return failed === 0;
}

export async function runTest(config: TestifyConfig, args: string[]) {
  const platform: 'ios' | 'android' = args.includes('--android')
    ? 'android'
    : 'ios';
  const watchMode = parseWatchArg(args);
  const filterPattern = parseFilterArg(args);

  console.log(`Running visual tests for ${platform}...`);

  const baselineDir = path.resolve(config.baselines, platform);
  const diffDir = path.resolve(config.baselines, `${platform}-diff`);
  const latestDir = path.resolve(config.baselines, `${platform}-latest`);

  fs.mkdirSync(diffDir, { recursive: true });
  fs.mkdirSync(latestDir, { recursive: true });

  const server = createServer(config.port);
  await server.start();

  try {
    console.log('Launching simulator...');
    await launchSimulator(config, platform);

    console.log('Waiting for app connection...');
    await server.waitForConnection(60000);

    // Send configuration to app
    server.sendConfig({ idleDetection: config.idleDetection });

    const allComponents = await server.getComponentList();
    const components = filterComponents(allComponents, filterPattern);

    if (filterPattern) {
      console.log(
        `Testing ${components.length} of ${allComponents.length} components (filter: ${filterPattern})\n`,
      );
    } else {
      console.log(`Testing ${components.length} components\n`);
    }

    // Initial test run
    let results = await runTestCycle(
      config,
      platform,
      components,
      server,
      baselineDir,
      diffDir,
      latestDir,
    );

    const allPassed = printSummary(results, platform, config, diffDir);

    if (watchMode) {
      console.log('\nWatching for changes... (Ctrl+C to exit)\n');

      const watcher = createWatcher({
        paths: [config.registry, path.dirname(config.registry)],
        onChange: async (changedFile) => {
          console.log(`\n[watch] File changed: ${path.basename(changedFile)}`);
          console.log('Re-running tests...\n');

          // Re-fetch component list to pick up registry changes
          const refreshedAllComponents = await server.getComponentList();
          const refreshedComponents = filterComponents(
            refreshedAllComponents,
            filterPattern,
          );

          console.log(`Testing ${refreshedComponents.length} components\n`);

          results = await runTestCycle(
            config,
            platform,
            refreshedComponents,
            server,
            baselineDir,
            diffDir,
            latestDir,
          );

          printSummary(results, platform, config, diffDir);
          console.log('\nWatching for changes... (Ctrl+C to exit)\n');
        },
      });

      // Keep process alive
      await new Promise<void>((resolve) => {
        process.on('SIGINT', () => {
          console.log('\nStopping watch mode...');
          watcher.close();
          resolve();
        });
      });
    } else if (!allPassed) {
      process.exit(1);
    }
  } finally {
    await cleanupStatusBar(platform);
    server.stop();
  }
}
