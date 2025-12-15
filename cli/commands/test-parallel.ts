import * as fs from 'node:fs';
import * as path from 'node:path';
import { compareImages } from '../compare';
import type { TestifyConfig } from '../config';
import { launchSimulator, takeScreenshot } from '../device/ios';
import { createParallelServer } from '../parallel-server';
import { type TestResult, generateHtmlReport } from '../report';

type Platform = 'ios' | 'android';

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

    // Send configuration to all apps
    server.sendConfigToAll({
      idleDetection: config.idleDetection,
      defaultWaitMs: config.defaultWaitMs,
    });

    // Get component list
    const components = await server.getComponentList();
    console.log(
      `\nTesting ${components.length} components on ${platforms.length} platform(s)\n`,
    );

    // Test each component on all platforms in parallel
    for (const component of components) {
      console.log(`\n┌─ ${component}`);

      const safeFilename = component.replace(/\//g, '-');

      // Mount on all platforms simultaneously
      await server.mountComponentOnAll(component);

      // Take screenshots on all platforms in parallel
      const screenshotPromises = platforms.map(async (platform) => {
        const baselineDir = path.resolve(config.baselines, platform);
        const latestDir = path.resolve(config.baselines, `${platform}-latest`);
        const diffDir = path.resolve(config.baselines, `${platform}-diff`);

        fs.mkdirSync(latestDir, { recursive: true });
        fs.mkdirSync(diffDir, { recursive: true });

        const baselinePath = path.join(baselineDir, `${safeFilename}.png`);
        const latestPath = path.join(latestDir, `${safeFilename}.png`);
        const diffPath = path.join(diffDir, `${safeFilename}.png`);

        try {
          const bundleId =
            platform === 'ios'
              ? config.ios.bundleId
              : config.android.packageName;
          await takeScreenshot(platform, latestPath, bundleId);

          if (!fs.existsSync(baselinePath)) {
            results.push({
              component,
              platform,
              passed: false,
              error: 'No baseline',
              baselinePath,
              latestPath,
              diffPath,
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
              baselinePath,
              latestPath,
            });
            console.log(`│  [${platform}] ✓ Pass`);
            if (fs.existsSync(diffPath)) fs.unlinkSync(diffPath);
          } else {
            results.push({
              component,
              platform,
              passed: false,
              diffPercentage: compareResult.diffPercentage,
              baselinePath,
              latestPath,
              diffPath,
            });
            console.log(
              `│  [${platform}] ✗ ${(compareResult.diffPercentage * 100).toFixed(2)}% diff`,
            );
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          results.push({
            component,
            platform,
            passed: false,
            error: errorMsg,
            baselinePath,
            latestPath,
            diffPath,
          });
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

    // Generate HTML report
    const reportPath = generateHtmlReport({
      outputDir: config.baselines,
      results,
      threshold: config.threshold,
    });

    console.log(`\nReport: file://${reportPath}`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.stop();
  }
}
