import { spawn } from 'node:child_process';
import type { TestifyConfig } from '../config';

async function exec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => {
      stdout += d;
    });
    proc.stderr.on('data', (d) => {
      stderr += d;
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Exit code: ${code}`));
      }
    });
  });
}

export async function bootSimulator(deviceName: string): Promise<string> {
  // Get device UDID from name
  const devicesJson = await exec('xcrun', [
    'simctl',
    'list',
    'devices',
    '--json',
  ]);
  const devices = JSON.parse(devicesJson);

  let deviceId: string | null = null;
  for (const [, runtimeDevices] of Object.entries(devices.devices)) {
    for (const device of runtimeDevices as Array<{
      name: string;
      udid: string;
      state: string;
    }>) {
      if (device.name === deviceName) {
        deviceId = device.udid;
        if (device.state === 'Booted') {
          return deviceId;
        }
        break;
      }
    }
    if (deviceId) break;
  }

  if (!deviceId) {
    throw new Error(`Simulator not found: ${deviceName}`);
  }

  await exec('xcrun', ['simctl', 'boot', deviceId]);
  return deviceId;
}

export async function launchSimulator(
  config: TestifyConfig,
  platform: string,
): Promise<void> {
  if (platform === 'ios') {
    const deviceId = await bootSimulator(config.ios.simulator);

    // Get bundle ID from installed apps or use default
    const bundleId =
      config.ios.bundleId || 'org.reactjs.native.example.TestifyExample';

    // Terminate any existing instance first
    try {
      await exec('xcrun', ['simctl', 'terminate', deviceId, bundleId]);
    } catch {
      // App might not be running, ignore
    }

    // Launch the app
    await exec('xcrun', ['simctl', 'launch', deviceId, bundleId]);

    // Wait for app to be ready
    await new Promise((r) => setTimeout(r, 2000));
  } else {
    // Android: adb -s <emulator> shell am start -n <package>/<activity>
    const packageName = config.android.packageName || 'com.testifyexample';
    await exec('adb', [
      'shell',
      'am',
      'start',
      '-n',
      `${packageName}/.MainActivity`,
    ]);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export function getDeviceId(deviceName: string): Promise<string> {
  return bootSimulator(deviceName);
}

// Cache the device ID to avoid repeated lookups
let cachedDeviceId: string | null = null;

export async function takeScreenshot(
  platform: string,
  outputPath: string,
  bundleId?: string,
  deviceName?: string,
): Promise<void> {
  if (platform === 'ios') {
    // Get specific device ID if we have a device name
    let deviceId = cachedDeviceId;
    if (!deviceId && deviceName) {
      deviceId = await getDeviceId(deviceName);
      cachedDeviceId = deviceId;
    }
    const target = deviceId || 'booted';

    // Bring app to foreground before screenshot
    if (bundleId) {
      try {
        await exec('xcrun', ['simctl', 'launch', target, bundleId]);
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        // App might already be running
      }
    }

    // Capture screenshot from specific simulator
    await exec('xcrun', ['simctl', 'io', target, 'screenshot', outputPath]);
  } else {
    // Android: bring app to foreground and screenshot
    if (bundleId) {
      await exec('adb', [
        'shell',
        'am',
        'start',
        '-n',
        `${bundleId}/.MainActivity`,
      ]);
      await new Promise((r) => setTimeout(r, 500));
    }
    await exec('adb', ['exec-out', 'screencap', '-p', '>', outputPath]);
  }
}

export async function buildIos(config: TestifyConfig): Promise<void> {
  const args = [
    '-workspace',
    config.ios.workspace || 'ios/*.xcworkspace',
    '-scheme',
    config.ios.scheme || 'YourApp',
    '-sdk',
    'iphonesimulator',
    '-configuration',
    'Debug',
    'build',
  ];

  await exec('xcodebuild', args);
}

export async function buildAndroid(config: TestifyConfig): Promise<void> {
  await exec('./gradlew', ['assembleDebug']);
}

export async function startMetro(entryFile: string): Promise<void> {
  // In reality, you'd spawn Metro as a background process
  spawn('npx', ['react-native', 'start', '--entry', entryFile], {
    stdio: 'inherit',
    detached: true,
  });
}
