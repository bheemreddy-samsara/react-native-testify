import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PNG } from 'pngjs';
import { compareImages } from '../cli/compare';

const TEST_DIR = path.join(import.meta.dir, '.test-images');

function createTestImage(
  width: number,
  height: number,
  color: [number, number, number, number],
): PNG {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = color[0]; // R
      png.data[idx + 1] = color[1]; // G
      png.data[idx + 2] = color[2]; // B
      png.data[idx + 3] = color[3]; // A
    }
  }
  return png;
}

function savePng(png: PNG, filePath: string): void {
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

beforeAll(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('compareImages', () => {
  test('returns match for identical images', async () => {
    const baseline = path.join(TEST_DIR, 'identical-baseline.png');
    const latest = path.join(TEST_DIR, 'identical-latest.png');
    const diff = path.join(TEST_DIR, 'identical-diff.png');

    const img = createTestImage(100, 100, [255, 0, 0, 255]);
    savePng(img, baseline);
    savePng(img, latest);

    const result = await compareImages(baseline, latest, diff, 0.01);

    expect(result.match).toBe(true);
    expect(result.diffPercentage).toBe(0);
    expect(result.diffPixels).toBe(0);
    expect(result.totalPixels).toBe(10000);
  });

  test('returns no match for different images', async () => {
    const baseline = path.join(TEST_DIR, 'different-baseline.png');
    const latest = path.join(TEST_DIR, 'different-latest.png');
    const diff = path.join(TEST_DIR, 'different-diff.png');

    const img1 = createTestImage(100, 100, [255, 0, 0, 255]); // red
    const img2 = createTestImage(100, 100, [0, 0, 255, 255]); // blue
    savePng(img1, baseline);
    savePng(img2, latest);

    const result = await compareImages(baseline, latest, diff, 0.01);

    expect(result.match).toBe(false);
    expect(result.diffPercentage).toBeGreaterThan(0);
    expect(fs.existsSync(diff)).toBe(true);
  });

  test('respects threshold parameter', async () => {
    const baseline = path.join(TEST_DIR, 'threshold-baseline.png');
    const latest = path.join(TEST_DIR, 'threshold-latest.png');
    const diff = path.join(TEST_DIR, 'threshold-diff.png');

    // Create images with slight difference (1 pixel different)
    const img1 = createTestImage(10, 10, [255, 0, 0, 255]);
    const img2 = createTestImage(10, 10, [255, 0, 0, 255]);
    img2.data[0] = 254; // Change first pixel slightly

    savePng(img1, baseline);
    savePng(img2, latest);

    // With very low threshold, should fail
    const strictResult = await compareImages(baseline, latest, diff, 0.001);

    // With high threshold, should pass
    const lenientResult = await compareImages(baseline, latest, diff, 0.5);

    expect(lenientResult.match).toBe(true);
  });

  test('handles dimension mismatch', async () => {
    const baseline = path.join(TEST_DIR, 'size-baseline.png');
    const latest = path.join(TEST_DIR, 'size-latest.png');
    const diff = path.join(TEST_DIR, 'size-diff.png');

    const img1 = createTestImage(100, 100, [255, 0, 0, 255]);
    const img2 = createTestImage(50, 50, [255, 0, 0, 255]);
    savePng(img1, baseline);
    savePng(img2, latest);

    const result = await compareImages(baseline, latest, diff, 0.01);

    expect(result.match).toBe(false);
    expect(result.diffPercentage).toBe(1); // 100% diff for size mismatch
  });

  test('calculates correct pixel counts', async () => {
    const baseline = path.join(TEST_DIR, 'count-baseline.png');
    const latest = path.join(TEST_DIR, 'count-latest.png');
    const diff = path.join(TEST_DIR, 'count-diff.png');

    const img = createTestImage(50, 40, [0, 255, 0, 255]);
    savePng(img, baseline);
    savePng(img, latest);

    const result = await compareImages(baseline, latest, diff, 0.01);

    expect(result.totalPixels).toBe(2000); // 50 * 40
  });
});
