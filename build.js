const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode', '@posit-dev/positron'],
  format: 'cjs',
  platform: 'node',
  target: 'node16',
  minify: !isWatch,
  sourcemap: true,
  mainFields: ['module', 'main'],
  treeShaking: true,
  logLevel: 'info',
};

if (isWatch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log('Watching for changes...');
  }).catch(() => process.exit(1));
} else {
  esbuild.build(buildOptions).catch(() => process.exit(1));
}
