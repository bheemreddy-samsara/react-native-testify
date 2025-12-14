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
    await bootSimulator(config.ios.simulator);
    // The app should already be built and installed - just launch
    // In real usage, you'd use: xcrun simctl launch <udid> <bundle-id>
  } else {
    // Android: adb -s <emulator> shell am start -n <package>/<activity>
  }
}

export async function takeScreenshot(
  platform: string,
  outputPath: string,
): Promise<void> {
  if (platform === 'ios') {
    // Capture screenshot from booted simulator
    await exec('xcrun', ['simctl', 'io', 'booted', 'screenshot', outputPath]);
  } else {
    // Android: adb exec-out screencap -p > output.png
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
