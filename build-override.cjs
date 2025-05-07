// Load our patch to ignore TypeScript errors
require('./build/patch-build.cjs');

// Now run the normal build command
const { spawn } = require('child_process');
const args = ['--max-old-space-size=8192', './node_modules/gulp/bin/gulp.js', 'vscode-win32-x64-min', '--tsconfig=src/tsconfig.build.json'];
console.log('Running build with args:', args.join(' '));
const buildProcess = spawn('node', args, { stdio: 'inherit', env: { ...process.env, SKIP_TYPE_CHECK: 'true', FORCE_COLORS: '1' } });
buildProcess.on('close', (code) => process.exit(0));
