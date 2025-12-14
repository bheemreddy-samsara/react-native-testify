import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { generateHtmlReport } from '../cli/report';

describe('generateHtmlReport', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testify-report-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('generates HTML report file', () => {
    const reportPath = generateHtmlReport({
      outputDir: tempDir,
      results: [],
      threshold: 0.01,
    });

    expect(fs.existsSync(reportPath)).toBe(true);
    expect(reportPath).toContain('testify-report.html');
  });

  it('includes pass/fail counts in report', () => {
    const reportPath = generateHtmlReport({
      outputDir: tempDir,
      results: [
        { component: 'Button', platform: 'ios', passed: true },
        {
          component: 'Card',
          platform: 'ios',
          passed: false,
          diffPercentage: 0.05,
        },
      ],
      threshold: 0.01,
    });

    const html = fs.readFileSync(reportPath, 'utf-8');
    expect(html).toContain('1'); // 1 passed
    expect(html).toContain('1'); // 1 failed
    expect(html).toContain('50.0%'); // pass rate
  });

  it('includes component names in report', () => {
    const reportPath = generateHtmlReport({
      outputDir: tempDir,
      results: [
        { component: 'Button_Primary', platform: 'ios', passed: true },
        {
          component: 'Card_Simple',
          platform: 'android',
          passed: false,
          error: 'No baseline',
        },
      ],
      threshold: 0.01,
    });

    const html = fs.readFileSync(reportPath, 'utf-8');
    expect(html).toContain('Button_Primary');
    expect(html).toContain('Card_Simple');
    expect(html).toContain('ios');
    expect(html).toContain('android');
  });

  it('includes threshold in report', () => {
    const reportPath = generateHtmlReport({
      outputDir: tempDir,
      results: [],
      threshold: 0.05,
    });

    const html = fs.readFileSync(reportPath, 'utf-8');
    expect(html).toContain('5.0%');
  });

  it('marks passed tests with pass class', () => {
    const reportPath = generateHtmlReport({
      outputDir: tempDir,
      results: [{ component: 'Button', platform: 'ios', passed: true }],
      threshold: 0.01,
    });

    const html = fs.readFileSync(reportPath, 'utf-8');
    expect(html).toContain('class="result-card pass"');
    expect(html).toContain('✓ Pass');
  });

  it('marks failed tests with fail class', () => {
    const reportPath = generateHtmlReport({
      outputDir: tempDir,
      results: [
        {
          component: 'Button',
          platform: 'ios',
          passed: false,
          diffPercentage: 0.1,
        },
      ],
      threshold: 0.01,
    });

    const html = fs.readFileSync(reportPath, 'utf-8');
    expect(html).toContain('class="result-card fail"');
    expect(html).toContain('✗ Fail');
    expect(html).toContain('10.00%');
  });
});
