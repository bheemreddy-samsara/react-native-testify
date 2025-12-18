# @samsara-dev/react-native-testify

## 0.2.1

### Patch Changes

- de2a6dd: Add an opt-in TextInput stabilizer for visual tests (disable focus APIs and hide caret).

## 0.2.0

### Minor Changes

- d6bc76b: Add `providers` and `wrapper` props to TestifyApp for cleaner auto-discovery workflow

  - TestifyApp now accepts optional `providers` and `wrapper` props that override registry options
  - Discovery command generates complete registry with `createRegistry()` (no manual wrapper file needed)
  - Recommended pattern: define component variants in `*.testify.tsx` files, configure providers/wrapper in entry file

## 0.1.1

### Patch Changes

- 8a9bef3: Update the bundled example app to use the published `@samsara-dev/react-native-testify` package and run the CLI via `bunx testify`.

## 0.1.0

### Minor Changes

- Initial release.

  Component-level visual regression testing for React Native, including a Bun-powered CLI to record baselines and run screenshot diffs on iOS and Android.
