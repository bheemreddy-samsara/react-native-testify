import type { TestifyConfig } from '../config';
import { launchSimulator } from '../device/ios';
import { createServer } from '../server';

export async function runList(config: TestifyConfig) {
  console.log('Fetching component list from app...');

  const server = createServer(config.port);
  await server.start();

  try {
    await launchSimulator(config, 'ios');
    await server.waitForConnection(60000);

    const components = await server.getComponentList();

    console.log(`\nRegistered components (${components.length}):\n`);
    for (const component of components) {
      console.log(`  • ${component}`);
    }
  } finally {
    server.stop();
  }
}
