import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TestifyConfig } from '../config';
import { discoverTestifyFiles, generateRegistryCode } from '../discovery';

export async function runDiscover(config: TestifyConfig, args: string[]) {
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');

  if (!config.discovery.enabled) {
    console.log('Discovery mode is disabled in config.');
    console.log(
      'Enable it by setting discovery.enabled = true in testify.config.ts',
    );
    return;
  }

  const rootDir = config.discovery.rootDir
    ? path.resolve(process.cwd(), config.discovery.rootDir)
    : process.cwd();

  console.log(`Discovering testify files in ${rootDir}...`);

  const files = discoverTestifyFiles({
    pattern: config.discovery.pattern,
    rootDir,
    exclude: config.discovery.exclude,
  });

  if (files.length === 0) {
    console.log('\nNo *.testify.tsx files found.');
    console.log('\nTo create a testify file, add a file like:');
    console.log('  src/components/Button.testify.tsx');
    console.log('\nWith content like:');
    console.log(`  import { Button } from './Button';
  export default {
    'Button/Primary': {
      render: () => <Button title="Click me" variant="primary" />,
    },
    'Button/Secondary': {
      render: () => <Button title="Click me" variant="secondary" />,
    },
  };`);
    return;
  }

  console.log(`\nFound ${files.length} testify file(s):\n`);

  for (const file of files) {
    if (verbose) {
      console.log(`  ${file.baseName}`);
      console.log(`    File: ${file.relativePath}`);
    } else {
      console.log(`  - ${file.baseName} (${file.relativePath})`);
    }
  }

  const registryPath = path.resolve(
    process.cwd(),
    config.discovery.generatedRegistry,
  );
  const registryCode = generateRegistryCode(files, registryPath);

  if (dryRun) {
    console.log('\n--- Generated Registry (dry-run) ---\n');
    console.log(registryCode);
    console.log('-----------------------------------\n');
    console.log(`Would write to: ${registryPath}`);
  } else {
    // Ensure directory exists
    fs.mkdirSync(path.dirname(registryPath), { recursive: true });
    fs.writeFileSync(registryPath, registryCode);
    console.log(`\nGenerated registry: ${registryPath}`);
    console.log('\nUpdate your index.testify.js to import this registry:');
    console.log(
      `  import registry from '${config.discovery.generatedRegistry}';`,
    );
  }
}
