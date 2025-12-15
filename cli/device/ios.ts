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

// Track active status bar overrides for cleanup
let activeStatusBarDeviceId: string | null = null;
let activeAndroidDemoMode = false;

async function canOverrideIosStatusBar(): Promise<boolean> {
  try {
    await exec('xcrun', ['simctl', 'help', 'status_bar']);
    return true;
  } catch {
    return false;
  }
}

export async function freezeStatusBar(deviceId: string): Promise<boolean> {
  if (!(await canOverrideIosStatusBar())) {
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

export async function enterAndroidDemoMode(): Promise<boolean> {
  try {
    await exec('adb', [
      'shell',
      'settings',
      'put',
      'global',
      'sysui_demo_allowed',
      '1',
    ]);
    await exec('adb', [
      'shell',
      'am',
      'broadcast',
      '-a',
      'com.android.systemui.demo',
      '-e',
      'command',
      'clock',
      '-e',
      'hhmm',
      '0941',
    ]);
    await exec('adb', [
      'shell',
      'am',
      'broadcast',
      '-a',
      'com.android.systemui.demo',
      '-e',
      'command',
      'network',
      '-e',
      'mobile',
      'show',
      '-e',
      'level',
      '4',
      '-e',
      'datatype',
      '4g',
      '-e',
      'wifi',
      'false',
    ]);
    await exec('adb', [
      'shell',
      'am',
      'broadcast',
      '-a',
      'com.android.systemui.demo',
      '-e',
      'command',
      'notifications',
      '-e',
      'visible',
      'false',
    ]);
    await exec('adb', [
      'shell',
      'am',
      'broadcast',
      '-a',
      'com.android.systemui.demo',
      '-e',
      'command',
      'battery',
      '-e',
      'plugged',
      'false',
      '-e',
      'level',
      '100',
    ]);
    activeAndroidDemoMode = true;
    return true;
  } catch {
    console.warn(
      '[warn] Could not enable Android demo mode (device may lack WRITE_SECURE_SETTINGS) - screenshots may have inconsistent status bar',
    );
    return false;
  }
}

export async function exitAndroidDemoMode(): Promise<void> {
  if (!activeAndroidDemoMode) return;

  try {
    await exec('adb', [
      'shell',
      'am',
      'broadcast',
      '-a',
      'com.android.systemui.demo',
      '-e',
      'command',
      'exit',
    ]);
    activeAndroidDemoMode = false;
  } catch {
    // Ignore errors during cleanup
  }
}

export async function cleanupStatusBar(platform?: string): Promise<void> {
  if (!platform || platform === 'ios') {
    await clearStatusBar();
  }
  if (!platform || platform === 'android') {
    await exitAndroidDemoMode();
  }
}

export function getDeviceId(deviceName: string): Promise<string> {
  return bootSimulator(deviceName);
}

/**
 * Set Android testify flag (creates file that app checks on startup).
 */
export async function setAndroidTestifyFlag(
  packageName: string,
): Promise<void> {
  // Create .testify flag file in app's internal storage
  await exec('adb', [
    'shell',
    'run-as',
    packageName,
    'touch',
    `/data/data/${packageName}/files/.testify`,
  ]);
}

/**
 * Clear Android testify flag.
 */
export async function clearAndroidTestifyFlag(
  packageName: string,
): Promise<void> {
  try {
    await exec('adb', [
      'shell',
      'run-as',
      packageName,
      'rm',
      `/data/data/${packageName}/files/.testify`,
    ]);
  } catch {
    // Ignore errors
  }
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

    // Freeze status bar for consistent screenshots (if enabled)
    if (config.statusBar.freeze) {
      await freezeStatusBar(deviceId);
    }

    // Get bundle ID from installed apps or use default
    const bundleId =
      config.ios.bundleId || 'org.reactjs.native.example.TestifyExample';

    // Terminate any existing instance first
    try {
      await exec('xcrun', ['simctl', 'terminate', deviceId, bundleId]);
    } catch {
      // App might not be running, ignore
    }

    // Launch the app with -TESTIFY flag to load testify bundle
    await exec('xcrun', ['simctl', 'launch', deviceId, bundleId, '-TESTIFY']);

    // Wait for app to be ready
    await new Promise((r) => setTimeout(r, 3000));
  } else {
    // Enter Android demo mode for consistent status bar (if enabled)
    if (config.statusBar.freeze) {
      await enterAndroidDemoMode();
    }

    // Android: adb shell am start -n <package>/<activity>
    const packageName = config.android.packageName || 'com.testifyexample';
    await exec('adb', [
      'shell',
      'am',
      'start',
      '-n',
      `${packageName}/.MainActivity`,
    ]);
    await new Promise((r) => setTimeout(r, 3000));
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
