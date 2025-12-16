# Testify Example App

This example app demonstrates all features of `@samsara-dev/react-native-testify` - a visual regression testing library for React Native.

## Features Demonstrated

| Feature | Description |
|---------|-------------|
| **Auto-Discovery** | Components discovered from `*.testify.tsx` files |
| **Providers** | ThemeProvider context injection (Card uses `useTheme()`) |
| **Wrapper** | Global wrapper component via TestifyApp props |
| **Custom waitMs** | Per-component wait times |
| **Custom waitFor** | Async wait conditions |
| **Full Screen Tests** | Testing complete screens with different states |
| **Idle Detection** | Smart wait for render completion |
| **Status Bar Freeze** | Consistent screenshots |

## Project Structure

```
src/
├── components/
│   ├── Button.tsx
│   ├── Button.testify.tsx     ← component variants
│   ├── Card.tsx
│   ├── Card.testify.tsx
│   └── ...
├── screens/
│   ├── ProfileScreen.tsx
│   └── ProfileScreen.testify.tsx  ← full screen tests
└── context/
    └── ThemeContext.tsx       ← provider example

testify/
├── .generated-registry.tsx    ← auto-generated (gitignored)
└── baselines/
    └── ios/                   ← baseline screenshots

index.testify.js               ← entry point with providers/wrapper
```

## Quick Start

### 1. Install dependencies

```bash
npm install
cd ios && pod install && cd ..
```

### 2. Generate registry (required after clone)

```bash
bunx testify discover
```

### 3. Record baselines

```bash
# Record all components
bunx testify record --ios

# Record specific components
bunx testify record --ios --filter "Button/*"
```

### 4. Run tests

```bash
# Test all components
bunx testify test --ios

# Test specific components
bunx testify test --ios --filter "Screen/Profile/*"
```

### 5. View report

Open `testify/baselines/testify-report.html` in your browser.

## Auto-Discovery Workflow

### 1. Create component testify files

```tsx
// src/components/Button.testify.tsx
import { Button } from './Button';

export default {
  'Button/Primary': {
    render: () => <Button title="Click" variant="primary" />,
  },
  'Button/Disabled': {
    render: () => <Button title="Click" variant="primary" disabled />,
  },
};
```

### 2. Regenerate registry

```bash
bunx testify discover
```

This updates `testify/.generated-registry.tsx` with all discovered components.

### 3. Entry point with providers

```tsx
// index.testify.js
import registry from './testify/.generated-registry';
import { ThemeProvider } from './src/context';

const providers = [{ component: ThemeProvider, props: {} }];

const wrapper = children => (
  <View style={styles.wrapper}>{children}</View>
);

const App = () => (
  <TestifyApp
    registry={registry}
    providers={providers}
    wrapper={wrapper}
  />
);
```

## Advanced Features

### Custom Wait Time

```tsx
'Card/Animated': {
  render: () => <Card title="Animated" />,
  waitMs: 500,  // Wait 500ms for animations
},
```

### Async Wait Condition

```tsx
'Button/AsyncLoad': {
  render: () => <Button title="Loaded" />,
  waitFor: async () => {
    await fetchData();  // Wait for async operation
  },
},
```

### Full Screen Testing

```tsx
// src/screens/ProfileScreen.testify.tsx
export default {
  'Screen/Profile/Loading': {
    render: () => <ProfileScreen loading={true} />,
  },
  'Screen/Profile/Error': {
    render: () => <ProfileScreen error="Something went wrong" />,
  },
  'Screen/Profile/WithData': {
    render: () => <ProfileScreen user={mockUser} />,
  },
};
```

## Configuration

### testify.config.ts

```ts
export default defineConfig({
  entry: './index.testify.js',
  baselines: './testify/baselines',
  threshold: 0.01,

  // Status bar freeze for consistent screenshots
  statusBar: { freeze: true },

  // Idle detection for smart waiting
  idleDetection: {
    enabled: true,
    timeoutMs: 5000,
    debounceMs: 100,
  },

  // Auto-discovery configuration
  discovery: {
    enabled: true,
    pattern: '**/*.testify.tsx',
    rootDir: './src',
    generatedRegistry: './testify/.generated-registry.tsx',
  },

  ios: {
    simulator: 'iPhone 16 Pro',
    bundleId: 'org.reactjs.native.example.TestifyExample',
  },
});
```

## Commands

| Command | Description |
|---------|-------------|
| `bunx testify record --ios` | Record baseline screenshots |
| `bunx testify test --ios` | Run visual regression tests |
| `bunx testify discover` | Discover and generate registry |
| `bunx testify discover --dry-run` | Preview discovery without writing |

### Filtering

```bash
# By exact name
--filter "Button/Primary"

# By wildcard
--filter "Button/*"
--filter "Screen/Profile/*"

# Multiple patterns
--filter "Button/*,Card/*"
```

## Test Cases

This example includes **22 test cases**:

**Components (17):**
- Avatar: Small, Medium, Large
- Badge: Success, Warning, Error, Info
- Button: Primary, Secondary, Danger, Disabled, AsyncLoad
- Card: Simple, WithSubtitle, WithButton, WithBadgeAndAvatar, Animated

**Screens (5):**
- ProfileScreen: Loading, Empty, Error, ActiveUser, InactiveUser
