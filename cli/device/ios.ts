import { spawn } from 'node:child_process';
import type { TestifyConfig } from '../config';
import * as android from './android';

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

// Track active status bar overrides for cleanup
let activeStatusBarDeviceId: string | null = null;

async function canOverrideStatusBar(): Promise<boolean> {
  try {
    await exec('xcrun', ['simctl', 'help', 'status_bar']);
    return true;
  } catch {
    return false;
  }
}

export async function freezeStatusBar(deviceId: string): Promise<boolean> {
  if (!(await canOverrideStatusBar())) {
    console.warn(
      '[warn] Status bar override not available (physical device or older Xcode) - skipping',
    );
    return false;
  }

  try {
    await exec('xcrun', [
      'simctl',
      'status_bar',
      deviceId,
      'override',
      '--time',
      '9:41',
      '--batteryState',
      'charged',
      '--batteryLevel',
      '100',
      '--wifiBars',
      '3',
      '--cellularBars',
      '4',
    ]);
    activeStatusBarDeviceId = deviceId;
    return true;
  } catch (err) {
    console.warn('[warn] Failed to freeze iOS status bar:', err);
    return false;
  }
}

export async function clearStatusBar(deviceId?: string): Promise<void> {
  const target = deviceId || activeStatusBarDeviceId;
  if (!target) return;

  try {
    await exec('xcrun', ['simctl', 'status_bar', target, 'clear']);
    activeStatusBarDeviceId = null;
  } catch {
    // Ignore errors during cleanup
  }
}

export async function cleanupStatusBar(platform?: string): Promise<void> {
  if (!platform || platform === 'ios') {
    await clearStatusBar();
  }
  if (!platform || platform === 'android') {
    await android.exitDemoMode();
  }
}

export function getDeviceId(deviceName: string): Promise<string> {
  return bootSimulator(deviceName);
}

export async function bootSimulator(deviceName: string): Promise<string> {
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

    if (config.statusBar.freeze) {
      await freezeStatusBar(deviceId);
    }

    const bundleId =
      config.ios.bundleId || 'org.reactjs.native.example.TestifyExample';

    try {
      await exec('xcrun', ['simctl', 'terminate', deviceId, bundleId]);
    } catch {
      // App might not be running
    }

    await exec('xcrun', ['simctl', 'launch', deviceId, bundleId, '-TESTIFY']);
    await new Promise((r) => setTimeout(r, 3000));
  } else {
    if (config.statusBar.freeze) {
      await android.enterDemoMode();
    }

    const packageName = config.android.packageName || 'com.testifyexample';
    await android.launchApp(packageName);
  }
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
    let deviceId = cachedDeviceId;
    if (!deviceId && deviceName) {
      deviceId = await getDeviceId(deviceName);
      cachedDeviceId = deviceId;
    }
    const target = deviceId || 'booted';

    if (bundleId) {
      try {
        await exec('xcrun', ['simctl', 'launch', target, bundleId]);
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        // App might already be running
      }
    }

    await exec('xcrun', ['simctl', 'io', target, 'screenshot', outputPath]);
  } else {
    await android.takeScreenshot(outputPath, bundleId);
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

export async function startMetro(entryFile?: string): Promise<void> {
  if (entryFile) {
    console.warn(
      `[warn] react-native start does not support an entry file flag. Ensure your app's index.js imports ${entryFile} when running Testify.`,
    );
  }

  spawn('npx', ['react-native', 'start', '--no-interactive'], {
    stdio: 'inherit',
    detached: true,
  });
}
