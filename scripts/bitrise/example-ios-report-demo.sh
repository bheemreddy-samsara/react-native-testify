#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="${BITRISE_DEPLOY_DIR:-"$ROOT_DIR/.ci/bitrise-deploy"}"
DERIVED_DATA_PATH="${DERIVED_DATA_PATH:-"$ROOT_DIR/.ci/DerivedData"}"
TESTIFY_EXAMPLE_FILTER="${TESTIFY_EXAMPLE_FILTER:-"Button/Primary,Card/Simple,Badge/Success"}"

mkdir -p "$DEPLOY_DIR" "$DERIVED_DATA_PATH"

cd "$ROOT_DIR"

if ! command -v corepack >/dev/null 2>&1; then
  echo "Corepack is required for pnpm" >&2
  exit 1
fi

corepack enable
corepack prepare pnpm@9.15.0 --activate

echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "pnpm: $(pnpm --version)"

echo "Installing root dependencies..."
pnpm install --frozen-lockfile

echo "Building Testify package (for local example dependency)..."
pnpm run build

echo "Installing example dependencies..."
pushd example >/dev/null
npm ci --no-audit --no-fund

echo "Generating testify registry..."
npx testify discover
popd >/dev/null

if ! command -v pod >/dev/null 2>&1; then
  sudo gem install cocoapods
fi

echo "Installing CocoaPods..."
pushd example/ios >/dev/null
pod install
popd >/dev/null

echo "Creating simulator..."
RUNTIME_ID=$(xcrun simctl list runtimes -j | jq -r '[.runtimes[] | select(.platform=="iOS" and .isAvailable==true)] | sort_by(.version) | last | .identifier')
if [[ -z "$RUNTIME_ID" || "$RUNTIME_ID" == "null" ]]; then
  echo "Failed to determine iOS runtime" >&2
  exit 1
fi

DEVICE_TYPE_ID=$(xcrun simctl list devicetypes -j | jq -r '.devicetypes[] | select(.name=="iPhone 15 Pro") | .identifier' | head -n 1)
if [[ -z "$DEVICE_TYPE_ID" || "$DEVICE_TYPE_ID" == "null" ]]; then
  DEVICE_TYPE_ID=$(xcrun simctl list devicetypes -j | jq -r '.devicetypes[] | select(.name | startswith("iPhone")) | .identifier' | head -n 1)
fi
if [[ -z "$DEVICE_TYPE_ID" || "$DEVICE_TYPE_ID" == "null" ]]; then
  echo "Failed to determine iPhone device type" >&2
  exit 1
fi

SIMULATOR_NAME="TestifyExample CI $(date +%s)"
SIMULATOR_UDID=$(xcrun simctl create "$SIMULATOR_NAME" "$DEVICE_TYPE_ID" "$RUNTIME_ID")

echo "Booting simulator ($SIMULATOR_NAME / $SIMULATOR_UDID)..."
xcrun simctl boot "$SIMULATOR_UDID"
xcrun simctl bootstatus "$SIMULATOR_UDID" -b

echo "Building app (Debug / Simulator)..."
xcodebuild \
  -workspace example/ios/TestifyExample.xcworkspace \
  -scheme TestifyExample \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "id=$SIMULATOR_UDID" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  build

APP_PATH=$(find "$DERIVED_DATA_PATH/Build/Products" -maxdepth 3 -type d -name "TestifyExample.app" | head -n 1)
if [[ -z "$APP_PATH" ]]; then
  echo "Failed to locate built .app" >&2
  exit 1
fi

echo "Installing app in simulator..."
xcrun simctl install "$SIMULATOR_UDID" "$APP_PATH"

METRO_LOG="$DEPLOY_DIR/metro.log"

echo "Starting Metro (background)..."
pushd example >/dev/null
npx react-native start --reset-cache --port 8081 --no-interactive >"$METRO_LOG" 2>&1 &
METRO_PID=$!
popd >/dev/null

cleanup() {
  if [[ -n "${METRO_PID:-}" ]]; then
    kill "$METRO_PID" || true
  fi
}
trap cleanup EXIT

echo "Waiting for Metro to be ready..."
for ((i = 0; i < 60; i++)); do
  if curl -fsS "http://localhost:8081/status" | grep -q "packager-status:running"; then
    echo "Metro is running"
    break
  fi
  sleep 2
done

if ! curl -fsS "http://localhost:8081/status" | grep -q "packager-status:running"; then
  echo "Metro failed to start" >&2
  tail -n 200 "$METRO_LOG" || true
  exit 1
fi

export TESTIFY_IOS_SIMULATOR_NAME="$SIMULATOR_NAME"

echo "Recording baselines..."
pushd example >/dev/null
npx testify record \
  --config testify.ci.config.ts \
  --ios \
  --filter "$TESTIFY_EXAMPLE_FILTER"

echo "Mutating a baseline (force a demo diff)..."
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const baselineDir = path.join(process.cwd(), 'testify', 'baselines', 'ios');
const files = fs
  .readdirSync(baselineDir)
  .filter((file) => file.endsWith('.png'))
  .sort();

if (files.length === 0) {
  throw new Error(`No baseline PNGs found in ${baselineDir}`);
}

const targetPath = path.join(baselineDir, files[0]);
const original = fs.readFileSync(targetPath);
const png = PNG.sync.read(original);
png.data[0] = (png.data[0] + 1) % 256;
fs.writeFileSync(targetPath, PNG.sync.write(png));

console.log(`Mutated baseline to force a diff: ${targetPath}`);
NODE

echo "Running tests (generate report)..."
set +e
npx testify test \
  --config testify.ci.config.ts \
  --ios \
  --filter "$TESTIFY_EXAMPLE_FILTER"
TEST_EXIT_CODE=$?
set -e

echo "Test exit code: $TEST_EXIT_CODE (ignored for demo workflow)"

REPORT_PATH="testify/baselines/testify-report.html"
if [[ -f "$REPORT_PATH" ]]; then
  cp "$REPORT_PATH" "$DEPLOY_DIR/testify-report.html"
else
  echo "Report missing at $REPORT_PATH" >&2
fi

zip -r "$DEPLOY_DIR/testify-example-ios-report.zip" testify/baselines >/dev/null
popd >/dev/null

echo "Artifacts written to $DEPLOY_DIR"
