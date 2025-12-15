import { spawn } from 'node:child_process';
import * as fs from 'node:fs';

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

async function execBinary(cmd: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    const chunks: Buffer[] = [];
    let stderr = '';

    proc.stdout.on('data', (d) => {
      chunks.push(Buffer.from(d));
    });
    proc.stderr.on('data', (d) => {
      stderr += d;
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(stderr || `Exit code: ${code}`));
      }
    });
  });
}

let activeDemoMode = false;

export async function enterDemoMode(): Promise<boolean> {
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
    activeDemoMode = true;
    return true;
  } catch {
    console.warn(
      '[warn] Could not enable Android demo mode - screenshots may have inconsistent status bar',
    );
    return false;
  }
}

export async function exitDemoMode(): Promise<void> {
  if (!activeDemoMode) return;

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
    activeDemoMode = false;
  } catch {
    // Ignore errors during cleanup
  }
}

export async function launchApp(packageName: string): Promise<void> {
  await exec('adb', [
    'shell',
    'am',
    'start',
    '-n',
    `${packageName}/.MainActivity`,
  ]);
  await new Promise((r) => setTimeout(r, 3000));
}

export async function takeScreenshot(
  outputPath: string,
  packageName?: string,
): Promise<void> {
  // Bring app to foreground before screenshot
  if (packageName) {
    await exec('adb', [
      'shell',
      'am',
      'start',
      '-n',
      `${packageName}/.MainActivity`,
    ]);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Capture screenshot binary data directly (no shell redirect needed)
  const pngData = await execBinary('adb', ['exec-out', 'screencap', '-p']);
  fs.writeFileSync(outputPath, pngData);
}

export async function setTestifyFlag(packageName: string): Promise<void> {
  await exec('adb', [
    'shell',
    'run-as',
    packageName,
    'touch',
    `/data/data/${packageName}/files/.testify`,
  ]);
}

export async function clearTestifyFlag(packageName: string): Promise<void> {
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

export async function bootEmulator(emulatorName: string): Promise<void> {
  // Check if emulator is already running
  try {
    const devices = await exec('adb', ['devices']);
    if (devices.includes('emulator')) {
      return; // Already running
    }
  } catch {
    // Continue to boot
  }

  // Start emulator in background
  spawn('emulator', ['-avd', emulatorName], {
    detached: true,
    stdio: 'ignore',
  });

  // Wait for device to be ready
  await exec('adb', ['wait-for-device']);
  await new Promise((r) => setTimeout(r, 5000));
}

export async function isDeviceConnected(): Promise<boolean> {
  try {
    const output = await exec('adb', ['devices']);
    const lines = output.trim().split('\n');
    // First line is header, check if there are connected devices
    return lines.length > 1 && lines.some((l) => l.includes('device'));
  } catch {
    return false;
  }
}
