import * as fs from 'node:fs';
import * as path from 'node:path';
import { compareImages } from '../compare';
import type { TestifyConfig } from '../config';
import { launchSimulator, takeScreenshot } from '../device/ios';
import { createParallelServer } from '../parallel-server';

type Platform = 'ios' | 'android';

interface TestResult {
  component: string;
  platform: Platform;
  passed: boolean;
  diffPercentage?: number;
  error?: string;
}

export async function runParallelTest(config: TestifyConfig, args: string[]) {
  const platforms: Platform[] = [];
  if (args.includes('--ios') || args.includes('--all')) platforms.push('ios');
  if (args.includes('--android') || args.includes('--all'))
    platforms.push('android');

  if (platforms.length === 0) {
    platforms.push('ios'); // Default to iOS
  }

  const results: TestResult[] = [];
  console.log(`\nRunning parallel visual tests on: ${platforms.join(', ')}\n`);

  const server = createParallelServer(config.port);
  await server.start();

  try {
    // Launch simulators/emulators
    console.log('Launching devices...');
    await Promise.all(platforms.map((p) => launchSimulator(config, p)));

    // Wait for all clients to connect
    console.log('Waiting for apps to connect...');
    await server.waitForClients(platforms, 60000);

    // Get component list
    const components = await server.getComponentList();
    console.log(
      `\nTesting ${components.length} components on ${platforms.length} platform(s)\n`,
    );

    // Test each component on all platforms in parallel
    for (const component of components) {
      console.log(`\n┌─ ${component}`);

      // Mount on all platforms simultaneously
      await server.mountComponentOnAll(component);

      // Wait for render stabilization
      await new Promise((r) => setTimeout(r, config.defaultWaitMs));

      // Take screenshots on all platforms in parallel
      const screenshotPromises = platforms.map(async (platform) => {
        const baselineDir = path.resolve(config.baselines, platform);
        const latestDir = path.resolve(config.baselines, `${platform}-latest`);
        const diffDir = path.resolve(config.baselines, `${platform}-diff`);

        fs.mkdirSync(latestDir, { recursive: true });
        fs.mkdirSync(diffDir, { recursive: true });

        const baselinePath = path.join(baselineDir, `${component}.png`);
        const latestPath = path.join(latestDir, `${component}.png`);
        const diffPath = path.join(diffDir, `${component}.png`);

        try {
          await takeScreenshot(platform, latestPath);

          if (!fs.existsSync(baselinePath)) {
            results.push({
              component,
              platform,
              passed: false,
              error: 'No baseline',
            });
            console.log(`│  [${platform}] ✗ No baseline`);
            return;
          }

          const compareResult = await compareImages(
            baselinePath,
            latestPath,
            diffPath,
            config.threshold,
          );

          if (compareResult.match) {
            results.push({
              component,
              platform,
              passed: true,
              diffPercentage: 0,
            });
            console.log(`│  [${platform}] ✓ Pass`);
            if (fs.existsSync(diffPath)) fs.unlinkSync(diffPath);
          } else {
            results.push({
              component,
              platform,
              passed: false,
              diffPercentage: compareResult.diffPercentage,
            });
            console.log(
              `│  [${platform}] ✗ ${(compareResult.diffPercentage * 100).toFixed(2)}% diff`,
            );
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          results.push({ component, platform, passed: false, error: errorMsg });
          console.log(`│  [${platform}] ✗ ${errorMsg}`);
        }
      });

      await Promise.all(screenshotPromises);

      // Unmount from all platforms
      await server.unmountComponentOnAll();
      console.log('└─');
    }

    // Summary
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);

    // Per-platform summary
    for (const platform of platforms) {
      const platformResults = results.filter((r) => r.platform === platform);
      const platformPassed = platformResults.filter((r) => r.passed).length;
      const platformFailed = platformResults.filter((r) => !r.passed).length;
      console.log(
        `  [${platform}] ${platformPassed} passed, ${platformFailed} failed`,
      );
    }
    console.log('═'.repeat(50));

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.stop();
  }
}
