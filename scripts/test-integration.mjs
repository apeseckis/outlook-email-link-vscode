import { runTests } from '@vscode/test-electron';
import { resolve } from 'node:path';
// Some terminal hosts set this; Electron must start as an editor for API tests.
delete process.env.ELECTRON_RUN_AS_NODE;
await runTests({ extensionDevelopmentPath: resolve('.'), extensionTestsPath: resolve('dist/integration.cjs'),
  launchArgs: ['--disable-extensions', '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust', '--no-sandbox'] });
