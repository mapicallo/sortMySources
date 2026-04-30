/**
 * Rasterize icons/svg into public/icons PNGs for Chromium manifest (16–128).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(fileURLToPath(import.meta.url));
const svgPath = join(root, '..', 'icons-source', 'sortmysources.svg');
const outDir = join(root, '..', 'public', 'icons');

const svg = readFileSync(svgPath);
for (const size of [16, 32, 48, 128]) {
  const dest = join(outDir, `icon${size}.png`);
  await sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toFile(dest);
  console.log('wrote', dest);
}
