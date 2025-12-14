import * as fs from 'node:fs';
import * as path from 'node:path';

const CONFIG_TEMPLATE = `import { defineConfig } from 'react-native-testify';

export default defineConfig({
  entry: './index.testify.js',
  baselines: './testify/baselines',
  threshold: 0.01,
  defaultWaitMs: 500,

  ios: {
    simulator: 'iPhone 15 Pro',
  },

  android: {
    emulator: 'Pixel_7_API_34',
  },
});
`;

const REGISTRY_TEMPLATE = `import { createRegistry } from 'react-native-testify';
// Import your components here
// import { Button, Card } from '../src/components';

export default createRegistry({
  // Add your components here
  // 'Button_Primary': () => <Button variant="primary" />,
  // 'Button_Disabled': () => <Button disabled />,
  // 'Card_Default': () => <Card title="Hello" />,
}, {
  // Optional: wrap all components with providers
  // wrapper: (children) => (
  //   <ThemeProvider>
  //     <ReduxProvider store={store}>
  //       {children}
  //     </ReduxProvider>
  //   </ThemeProvider>
  // ),
});
`;

const ENTRY_TEMPLATE = `import { AppRegistry } from 'react-native';
import { TestifyApp } from 'react-native-testify';
import registry from './testify/registry';

// Get app name from app.json
const appName = require('./app.json').name;

const App = () => <TestifyApp registry={registry} />;

AppRegistry.registerComponent(appName, () => App);
`;

const GITATTRIBUTES_LFS = `# Git LFS for baseline images
testify/baselines/**/*.png filter=lfs diff=lfs merge=lfs -text
`;

export async function runInit() {
  const cwd = process.cwd();

  console.log('Initializing react-native-testify...\n');

  // Create testify directory
  const testifyDir = path.join(cwd, 'testify');
  fs.mkdirSync(testifyDir, { recursive: true });
  fs.mkdirSync(path.join(testifyDir, 'baselines'), { recursive: true });

  // Create config file
  const configPath = path.join(cwd, 'testify.config.ts');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, CONFIG_TEMPLATE);
    console.log('  Created: testify.config.ts');
  } else {
    console.log('  Skipped: testify.config.ts (already exists)');
  }

  // Create registry file
  const registryPath = path.join(testifyDir, 'registry.tsx');
  if (!fs.existsSync(registryPath)) {
    fs.writeFileSync(registryPath, REGISTRY_TEMPLATE);
    console.log('  Created: testify/registry.tsx');
  } else {
    console.log('  Skipped: testify/registry.tsx (already exists)');
  }

  // Create entry file
  const entryPath = path.join(cwd, 'index.testify.js');
  if (!fs.existsSync(entryPath)) {
    fs.writeFileSync(entryPath, ENTRY_TEMPLATE);
    console.log('  Created: index.testify.js');
  } else {
    console.log('  Skipped: index.testify.js (already exists)');
  }

  // Add git-lfs attributes (optional)
  const gitattributesPath = path.join(cwd, '.gitattributes');
  if (fs.existsSync(gitattributesPath)) {
    const content = fs.readFileSync(gitattributesPath, 'utf-8');
    if (!content.includes('testify/baselines')) {
      fs.appendFileSync(gitattributesPath, `\n${GITATTRIBUTES_LFS}`);
      console.log('  Updated: .gitattributes (added LFS for baselines)');
    }
  }

  console.log(`
Setup complete! Next steps:

1. Add your components to testify/registry.tsx
2. Run: npx testify record --ios
3. Run: npx testify test --ios

For git-lfs support (recommended for baselines):
  git lfs install
  git lfs track "testify/baselines/**/*.png"
`);
}
