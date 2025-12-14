import * as fs from 'node:fs';
import * as path from 'node:path';
import { type CompareResult, compareImages } from '../compare';
import type { TestifyConfig } from '../config';
import { launchSimulator, takeScreenshot } from '../device/ios';
import { createServer } from '../server';

interface TestResult {
  component: string;
  passed: boolean;
  diffPercentage?: number;
  error?: string;
}

export async function runTest(config: TestifyConfig, args: string[]) {
  const platform = args.includes('--android') ? 'android' : 'ios';
  const results: TestResult[] = [];

  console.log(`Running visual tests for ${platform}...`);

  const baselineDir = path.resolve(config.baselines, platform);
  const diffDir = path.resolve(config.baselines, `${platform}-diff`);
  const latestDir = path.resolve(config.baselines, `${platform}-latest`);

  // Ensure directories exist
  fs.mkdirSync(diffDir, { recursive: true });
  fs.mkdirSync(latestDir, { recursive: true });

  // Start WebSocket server
  const server = createServer(config.port);
  await server.start();

  try {
    // Launch simulator
    console.log('Launching simulator...');
    await launchSimulator(config, platform);

    // Wait for app connection
    console.log('Waiting for app connection...');
    await server.waitForConnection(60000);

    // Get component list
    const components = await server.getComponentList();
    console.log(`Testing ${components.length} components\n`);

    for (const component of components) {
      const baselinePath = path.join(baselineDir, `${component}.png`);
      const latestPath = path.join(latestDir, `${component}.png`);
      const diffPath = path.join(diffDir, `${component}.png`);

      // Check baseline exists
      if (!fs.existsSync(baselinePath)) {
        results.push({
          component,
          passed: false,
          error: 'No baseline found. Run `testify record` first.',
        });
        console.log(`  ✗ ${component} - No baseline`);
        continue;
      }

      // Mount and screenshot with retry
      let compareResult: CompareResult | null = null;
      let lastError: string | null = null;

      for (let attempt = 0; attempt <= config.retryCount; attempt++) {
        try {
          await server.mountComponent(component);
          await new Promise((r) => setTimeout(r, config.defaultWaitMs));
          await takeScreenshot(platform, latestPath);
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
        });
        console.log(`  ✗ ${component} - ${lastError}`);
        continue;
      }

      if (compareResult.match) {
        results.push({ component, passed: true, diffPercentage: 0 });
        console.log(`  ✓ ${component}`);
        // Clean up diff if passed
        if (fs.existsSync(diffPath)) fs.unlinkSync(diffPath);
      } else {
        results.push({
          component,
          passed: false,
          diffPercentage: compareResult.diffPercentage,
        });
        console.log(
          `  ✗ ${component} - ${(compareResult.diffPercentage * 100).toFixed(2)}% diff`,
        );
      }
    }

    // Summary
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log(`\n${'─'.repeat(40)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
      console.log(`\nDiff images saved to: ${diffDir}`);
      process.exit(1);
    }
  } finally {
    server.stop();
  }
}
