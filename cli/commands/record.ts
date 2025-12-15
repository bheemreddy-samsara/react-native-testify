import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TestifyConfig } from '../config';
import {
  cleanupStatusBar,
  launchSimulator,
  takeScreenshot,
} from '../device/ios';
import { createServer } from '../server';

export async function runRecord(config: TestifyConfig, args: string[]) {
  const platform = args.includes('--android') ? 'android' : 'ios';

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

    // Get component list from app
    const components = await server.getComponentList();
    console.log(`Found ${components.length} components to record`);

    // Record each component
    for (const component of components) {
      console.log(`  Recording: ${component}`);

      await server.mountComponent(component);

      // Wait for render stabilization
      await new Promise((r) => setTimeout(r, config.defaultWaitMs));

      // Take screenshot
      const screenshotPath = path.join(baselineDir, `${component}.png`);
      const bundleId =
        platform === 'ios' ? config.ios.bundleId : config.android.packageName;
      await takeScreenshot(platform, screenshotPath, bundleId);

      await server.unmountComponent();
    }

    console.log(`\nRecorded ${components.length} baselines to ${baselineDir}`);
  } finally {
    await cleanupStatusBar(platform);
    server.stop();
  }
}
