import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: [
    "out/test/pathNormalizer.test.js",
    "out/test/svnFinder.test.js",
    "out/test/svn.test.js",
    "out/test/commands/add.test.js",
    "out/test/commands/commandBoilerplate.test.js",
    "out/test/commands/commitAll.test.js",
    "out/test/commands/upgrade.test.js"
  ],
  mocha: {
    ui: 'tdd',
    timeout: 30000,
    color: true
  }
});
