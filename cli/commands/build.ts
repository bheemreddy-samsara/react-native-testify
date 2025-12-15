import type { TestifyConfig } from '../config';
import { buildAndroid } from '../device/android';
import { buildIos } from '../device/ios';

export async function runBuild(config: TestifyConfig, args: string[]) {
  const platform = args.includes('--android') ? 'android' : 'ios';

  console.log(`Building for ${platform}...`);

  if (platform === 'ios') {
    await buildIos(config);
  } else {
    await buildAndroid(config);
  }

  console.log('Build complete!');
}
