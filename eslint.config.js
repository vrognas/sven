// ESLint v9 flat config
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      '**/vscode.proposed.d.ts',
      'src/test/**/*.ts',
      'test/**/*.ts',       // Test files
      'src/tools/**/*.ts',
      'scripts/**/*.ts',    // Script files
      'dist/**',
      'out/**',
      'node_modules/**',
      '*.js', // Ignore JS config files
      'build.js',
      'css/**',
      'icons/**',
      'images/**',
      '**/*.json'
    ]
  },

  // Base TypeScript config
  ...tseslint.configs.recommended,

  // Custom rules for TypeScript files
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error', // Changed from 'warn' - Phase 22.A
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrors: 'none'
      }],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  },

  // Phase 22.A: Gradual type safety migration - whitelist existing violations
  // TODO: Fix these files incrementally, then remove overrides
  {
    files: [
      // Core infrastructure (Phase 22.B priority)
      'src/decorators.ts',           // 34 any instances
      'src/util.ts',                 // 9 any instances
      'src/parser/xmlParserAdapter.ts', // 13 any instances
      'src/commands/command.ts',     // 1 any instance

      // God classes (Phase 23.A priority)
      'src/repository.ts',           // 4 any instances
      'src/source_control_manager.ts', // 5 any instances
      'src/svn.ts',                  // 10 any instances
      'src/svnRepository.ts',        // 1 any instance

      // Other files with existing violations
      'src/commands/changeList.ts',  // 1 any instance
      'src/commands/checkout.ts',    // 4 any instances
      'src/commands/diffWithExternalTool.ts', // 1 any instance
      'src/commands/pullIncomingChange.ts', // 1 any instance
      'src/common/types.ts',         // 1 any instance
      'src/helpers/configuration.ts', // 1 any instance
      'src/historyView/common.ts',   // 1 any instance
      'src/input/revert.ts',         // 1 any instance
      'src/parser/statusParser.ts',  // 3 any instances
      'src/positron/runtime.ts',     // 1 any instance
      'src/resource.ts',             // 1 any instance
      'src/security/errorSanitizer.ts', // 7 any instances
      'src/svnError.ts',             // 1 any instance
      'src/svnFileSystemProvider.ts', // 1 any instance
      'src/svnFinder.ts',            // 1 any instance
      'src/util/fileOperations.ts'   // 2 any instances
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn' // Temporary - fix incrementally
    }
  },

  // Positron runtime needs require() for dynamic import
  {
    files: ['src/positron/runtime.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'warn' // Temporary - dynamic Positron API loading
    }
  }
);
