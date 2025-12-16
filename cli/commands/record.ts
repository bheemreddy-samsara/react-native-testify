import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TestifyConfig } from '../config';
import {
  cleanupStatusBar,
  launchSimulator,
  takeScreenshot,
} from '../device/ios';
import { filterComponents, parseFilterArg } from '../filter';
import { createServer } from '../server';

export async function runRecord(config: TestifyConfig, args: string[]) {
  const platform: 'ios' | 'android' = args.includes('--android')
    ? 'android'
    : 'ios';

  console.log(`Recording baselines for ${platform}...`);

  // Ensure baselines directory exists
  const baselineDir = path.resolve(config.baselines, platform);
  fs.mkdirSync(baselineDir, { recursive: true });

  // Start WebSocket server
  const server = createServer(config.port);
  await server.start();

  try {
    // Launch simulator with test harness
    console.log('Launching simulator...');
    await launchSimulator(config, platform);

    // Wait for app to connect
    console.log('Waiting for app connection...');
    await server.waitForConnection(60000);

    // Send configuration to app
    server.sendConfig({
      idleDetection: config.idleDetection,
      defaultWaitMs: config.defaultWaitMs,
    });

    // Get component list from app and apply filter
    const allComponents = await server.getComponentList();
    const filterPattern = parseFilterArg(args);
    const components = filterComponents(allComponents, filterPattern);

    if (filterPattern) {
      console.log(
        `Recording ${components.length} of ${allComponents.length} components (filter: ${filterPattern})`,
      );
    } else {
      console.log(`Found ${components.length} components to record`);
    }

    // Record each component
    for (const component of components) {
      console.log(`  Recording: ${component}`);

      let lastError: string | null = null;

      for (let attempt = 0; attempt <= config.retryCount; attempt++) {
        let mounted = false;

        try {
          await server.mountComponent(component);
          mounted = true;

          // Take screenshot (sanitize component name for filename)
          const safeFilename = component.replace(/\//g, '-');
          const screenshotPath = path.join(baselineDir, `${safeFilename}.png`);
          const bundleId =
            platform === 'ios'
              ? config.ios.bundleId
              : config.android.packageName;
          await takeScreenshot(platform, screenshotPath, bundleId);

          await server.unmountComponent();
          mounted = false;
          lastError = null;
          break;
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          lastError = errorMessage;

          if (mounted) {
            try {
              await server.unmountComponent();
            } catch {
              // best-effort cleanup
            }
          }

          if (attempt < config.retryCount) {
            console.warn(
              `  [warn] ${component} attempt ${attempt + 1}/${config.retryCount + 1} failed: ${errorMessage}`,
            );

            if (
              /disconnected|No app connected|Timeout waiting for app connection|Timeout waiting for ready message/i.test(
                errorMessage,
              )
            ) {
              console.warn(
                '  [warn] Re-launching app after connection issue...',
              );
              await launchSimulator(config, platform);
              await server.waitForConnection(60000);
              server.sendConfig({
                idleDetection: config.idleDetection,
                defaultWaitMs: config.defaultWaitMs,
              });
            }

            await new Promise((r) => setTimeout(r, config.retryDelayMs));
          }
        }
      }

      if (lastError) {
        throw new Error(`Failed to record ${component}: ${lastError}`);
      }
    }

    console.log(`\nRecorded ${components.length} baselines to ${baselineDir}`);
  } finally {
    await cleanupStatusBar(platform);
    server.stop();
  }
}
