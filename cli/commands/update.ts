import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TestifyConfig } from '../config';
import {
  cleanupStatusBar,
  launchSimulator,
  takeScreenshot,
} from '../device/ios';
import { createServer } from '../server';

export async function runUpdate(config: TestifyConfig, args: string[]) {
  const platform = args.includes('--android') ? 'android' : 'ios';
  const componentFilter = args.find((a) => !a.startsWith('--'));

  console.log(
    componentFilter
      ? `Updating baseline for: ${componentFilter}`
      : 'Updating all baselines',
  );

  const baselineDir = path.resolve(config.baselines, platform);
  fs.mkdirSync(baselineDir, { recursive: true });

  const server = createServer(config.port);
  await server.start();

  try {
    await launchSimulator(config, platform);
    await server.waitForConnection(60000);

    server.sendConfig({
      idleDetection: config.idleDetection,
      defaultWaitMs: config.defaultWaitMs,
    });

    const allComponents = await server.getComponentList();
    const components = componentFilter
      ? allComponents.filter((c) => c.includes(componentFilter))
      : allComponents;

    if (components.length === 0) {
      console.log('No matching components found');
      return;
    }

    for (const component of components) {
      console.log(`  Updating: ${component}`);

      await server.mountComponent(component);

      const safeFilename = component.replace(/\//g, '-');
      const screenshotPath = path.join(baselineDir, `${safeFilename}.png`);
      const bundleId =
        platform === 'ios' ? config.ios.bundleId : config.android.packageName;
      await takeScreenshot(platform, screenshotPath, bundleId);

      await server.unmountComponent();
    }

    console.log(`\nUpdated ${components.length} baseline(s)`);
  } finally {
    await cleanupStatusBar(platform);
    server.stop();
  }
}
