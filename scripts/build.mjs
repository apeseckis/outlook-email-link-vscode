import { build } from 'esbuild';
import { readFile, writeFile, access } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
const result = await build({ entryPoints: ['src/extension.ts'], bundle: true, platform: 'node',
  target: 'node20', format: 'cjs', external: ['vscode'], outfile: 'dist/extension.cjs', legalComments: 'eof', metafile: true });
const notices = new Map();
for (const input of Object.keys(result.metafile.inputs).filter(path => path.includes('node_modules/'))) {
  let dir = dirname(resolve(input));
  while (dir !== dirname(dir)) {
    try {
      await access(join(dir, 'package.json'));
      const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
      if (!pkg.name) { dir = dirname(dir); continue; }
      if (!notices.has(pkg.name)) {
        let license;
        for (const file of ['license', 'LICENSE', 'LICENSE.md', 'license.md', 'LICENSE-MIT']) {
          try { license = await readFile(join(dir, file), 'utf8'); break; } catch { /* Try next filename. */ }
        }
        if (!license) throw new Error(`Missing license for ${pkg.name}`);
        notices.set(pkg.name, `${pkg.name}@${pkg.version}\n${license}`);
      }
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      dir = dirname(dir);
    }
  }
}
await writeFile('THIRD_PARTY_NOTICES.txt', [...notices.values()].sort().join('\n\n---\n\n'));
await build({ entryPoints: ['test/integration.ts'], bundle: true, platform: 'node',
  target: 'node20', format: 'cjs', external: ['vscode'], outfile: 'dist/integration.cjs' });
