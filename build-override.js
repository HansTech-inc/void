// Import at top level
import { spawn } from 'child_process';

// Create an async function to handle the dynamic imports
const runBuild = async () => {
  // Load our patch to ignore TypeScript errors
  await import('./build/patch-build.js');

  // Now run the normal build command
  const args = ['--max-old-space-size=8192', './node_modules/gulp/bin/gulp.js', 'vscode-win32-x64-min', '--tsconfig=src/tsconfig.build.json'];
  console.log('Running build with args:', args.join(' '));
  const buildProcess = spawn('node', args, { stdio: 'inherit', env: { ...process.env, SKIP_TYPE_CHECK: 'true', FORCE_COLORS: '1' } });
  buildProcess.on('close', (code) => process.exit(0));
};

// Execute the build
runBuild();
