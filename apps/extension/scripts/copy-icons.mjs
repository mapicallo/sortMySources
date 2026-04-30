import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Ensure Chromium manifest PNGs exist in public/icons/. */
const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });
const png = join(outDir, 'icon128.png');

if (!existsSync(png)) {
  const extRoot = join(root, '..');
  console.log('[copy-icons] generating PNG icons…');
  const r = spawnSync('npm', ['run', 'icons'], { cwd: extRoot, shell: true, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
