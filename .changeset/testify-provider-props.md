---
"@samsara-dev/react-native-testify": minor
---

Add `providers` and `wrapper` props to TestifyApp for cleaner auto-discovery workflow

- TestifyApp now accepts optional `providers` and `wrapper` props that override registry options
- Discovery command generates complete registry with `createRegistry()` (no manual wrapper file needed)
- Recommended pattern: define component variants in `*.testify.tsx` files, configure providers/wrapper in entry file
