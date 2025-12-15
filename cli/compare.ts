import * as fs from 'node:fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface CompareResult {
  match: boolean;
  diffPercentage: number;
  diffPixels: number;
  totalPixels: number;
}

export async function compareImages(
  baselinePath: string,
  latestPath: string,
  diffPath: string,
  threshold: number,
): Promise<CompareResult> {
  const baselineData = fs.readFileSync(baselinePath);
  const latestData = fs.readFileSync(latestPath);

  const baseline = PNG.sync.read(baselineData);
  const latest = PNG.sync.read(latestData);

  // Check dimensions match
  if (baseline.width !== latest.width || baseline.height !== latest.height) {
    return {
      match: false,
      diffPercentage: 1,
      diffPixels: baseline.width * baseline.height,
      totalPixels: baseline.width * baseline.height,
    };
  }

  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(
    baseline.data,
    latest.data,
    diff.data,
    width,
    height,
    { threshold },
  );

  const totalPixels = width * height;
  const diffPercentage = diffPixels / totalPixels;
  const match = diffPercentage <= threshold;

  // Write diff image
  if (!match) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  return {
    match,
    diffPercentage,
    diffPixels,
    totalPixels,
  };
}
