import * as fs from 'node:fs';
import * as path from 'node:path';

export interface TestResult {
  component: string;
  platform: 'ios' | 'android';
  passed: boolean;
  diffPercentage?: number;
  error?: string;
  baselinePath?: string;
  latestPath?: string;
  diffPath?: string;
}

export interface ReportOptions {
  outputDir: string;
  results: TestResult[];
  threshold: number;
}

function imageToBase64(imagePath: string): string | null {
  if (!fs.existsSync(imagePath)) return null;
  const data = fs.readFileSync(imagePath);
  return `data:image/png;base64,${data.toString('base64')}`;
}

export function generateHtmlReport(options: ReportOptions): string {
  const { outputDir, results, threshold } = options;

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

  const timestamp = new Date().toISOString();

  const resultRows = results
    .map((result) => {
      const baselineImg = result.baselinePath
        ? imageToBase64(result.baselinePath)
        : null;
      const latestImg = result.latestPath
        ? imageToBase64(result.latestPath)
        : null;
      const diffImg = result.diffPath ? imageToBase64(result.diffPath) : null;

      const statusClass = result.passed ? 'pass' : 'fail';
      const statusText = result.passed ? '✓ Pass' : '✗ Fail';
      const diffText = result.diffPercentage
        ? `${(result.diffPercentage * 100).toFixed(2)}%`
        : result.error || 'N/A';

      return `
      <div class="result-card ${statusClass}">
        <div class="result-header">
          <span class="component-name">${result.component}</span>
          <span class="platform-badge">${result.platform}</span>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="diff-info">
          ${result.passed ? '' : `<span class="diff-value">Diff: ${diffText}</span>`}
        </div>
        <div class="images-container">
          <div class="image-box">
            <div class="image-label">Baseline</div>
            ${baselineImg ? `<img src="${baselineImg}" alt="Baseline" />` : '<div class="no-image">No baseline</div>'}
          </div>
          <div class="image-box">
            <div class="image-label">Latest</div>
            ${latestImg ? `<img src="${latestImg}" alt="Latest" />` : '<div class="no-image">No screenshot</div>'}
          </div>
          <div class="image-box">
            <div class="image-label">Diff</div>
            ${diffImg ? `<img src="${diffImg}" alt="Diff" />` : '<div class="no-image">No diff</div>'}
          </div>
        </div>
      </div>
    `;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Testify Visual Regression Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      padding: 24px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #30363d;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
      color: #f0f6fc;
    }
    .header .timestamp {
      color: #8b949e;
      font-size: 14px;
    }
    .summary {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 32px;
    }
    .summary-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 16px 32px;
      text-align: center;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
    }
    .summary-card .label {
      font-size: 14px;
      color: #8b949e;
      margin-top: 4px;
    }
    .summary-card.passed .value { color: #3fb950; }
    .summary-card.failed .value { color: #f85149; }
    .summary-card.total .value { color: #58a6ff; }
    .filter-bar {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .filter-btn {
      background: #21262d;
      border: 1px solid #30363d;
      color: #c9d1d9;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .filter-btn:hover { background: #30363d; }
    .filter-btn.active { background: #388bfd; border-color: #388bfd; }
    .results {
      max-width: 1200px;
      margin: 0 auto;
    }
    .result-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .result-card.fail { border-color: #f85149; }
    .result-card.pass { border-color: #3fb950; }
    .result-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #0d1117;
    }
    .component-name {
      font-weight: 600;
      font-size: 16px;
      flex: 1;
    }
    .platform-badge {
      background: #21262d;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      text-transform: uppercase;
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge.pass { background: #238636; color: #fff; }
    .status-badge.fail { background: #da3633; color: #fff; }
    .diff-info {
      padding: 0 16px 12px;
    }
    .diff-value {
      color: #f85149;
      font-size: 14px;
    }
    .images-container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 16px;
    }
    .image-box {
      text-align: center;
    }
    .image-label {
      font-size: 12px;
      color: #8b949e;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .image-box img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      border: 1px solid #30363d;
    }
    .no-image {
      background: #21262d;
      border: 1px dashed #30363d;
      border-radius: 4px;
      padding: 40px;
      color: #8b949e;
      font-size: 14px;
    }
    .threshold-info {
      text-align: center;
      color: #8b949e;
      font-size: 14px;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 Testify Visual Regression Report</h1>
    <div class="timestamp">Generated: ${timestamp}</div>
  </div>

  <div class="summary">
    <div class="summary-card passed">
      <div class="value">${passed}</div>
      <div class="label">Passed</div>
    </div>
    <div class="summary-card failed">
      <div class="value">${failed}</div>
      <div class="label">Failed</div>
    </div>
    <div class="summary-card total">
      <div class="value">${passRate}%</div>
      <div class="label">Pass Rate</div>
    </div>
  </div>

  <div class="filter-bar">
    <button class="filter-btn active" onclick="filterResults('all')">All (${total})</button>
    <button class="filter-btn" onclick="filterResults('pass')">Passed (${passed})</button>
    <button class="filter-btn" onclick="filterResults('fail')">Failed (${failed})</button>
  </div>

  <div class="results">
    ${resultRows}
  </div>

  <div class="threshold-info">
    Threshold: ${(threshold * 100).toFixed(1)}% | Components above this threshold are marked as failed
  </div>

  <script>
    function filterResults(filter) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      
      document.querySelectorAll('.result-card').forEach(card => {
        if (filter === 'all') {
          card.style.display = 'block';
        } else if (filter === 'pass') {
          card.style.display = card.classList.contains('pass') ? 'block' : 'none';
        } else if (filter === 'fail') {
          card.style.display = card.classList.contains('fail') ? 'block' : 'none';
        }
      });
    }
  </script>
</body>
</html>`;

  const reportPath = path.join(outputDir, 'testify-report.html');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(reportPath, html);

  return reportPath;
}
