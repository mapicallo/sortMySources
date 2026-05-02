/**
 * Chrome Web Store promotional tiles (no alpha, exact pixel sizes).
 * Output: pantallazos_shortMySources/chrome-store-promo/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join('C:', 'code', 'pantallazos_shortMySources', 'chrome-store-promo');
fs.mkdirSync(outDir, { recursive: true });

const smallSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5f3ff"/>
      <stop offset="100%" stop-color="#e0e7ff"/>
    </linearGradient>
  </defs>
  <rect width="440" height="280" fill="url(#bg)"/>
  <g transform="translate(36,76) scale(0.72)">
    <rect width="128" height="128" rx="20" fill="#4f46e5"/>
    <path fill="#fff" d="M32 40h24v14H32V40zm0 34h42v14H32V74zm0 34h62v14H32v-14z"/>
  </g>
  <text x="168" y="118" font-family="Segoe UI, system-ui, sans-serif" font-size="26" font-weight="700" fill="#1e1b4b">SortMySources</text>
  <text x="168" y="150" font-family="Segoe UI, system-ui, sans-serif" font-size="13.5" fill="#475569">Maps of sources — organize links, snippets + files</text>
  <text x="168" y="178" font-family="Segoe UI, system-ui, sans-serif" font-size="13.5" fill="#64748b">Floating panel · Local storage · Export + share maps</text>
</svg>`;

const marqueeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560">
  <defs>
    <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f5f3ff"/>
      <stop offset="55%" stop-color="#eef2ff"/>
      <stop offset="100%" stop-color="#e0e7ff"/>
    </linearGradient>
  </defs>
  <rect width="1400" height="560" fill="url(#bg2)"/>
  <g transform="translate(72,108) scale(2.15)">
    <rect width="128" height="128" rx="20" fill="#4f46e5"/>
    <path fill="#fff" d="M32 40h24v14H32V40zm0 34h42v14H32V74zm0 34h62v14H32v-14z"/>
  </g>
  <text x="410" y="228" font-family="Segoe UI, system-ui, sans-serif" font-size="54" font-weight="700" fill="#1e1b4b">SortMySources</text>
  <text x="410" y="290" font-family="Segoe UI, system-ui, sans-serif" font-size="24" fill="#475569">Maps of sources — capture as you browse, search across maps, share as JSON</text>
  <text x="410" y="340" font-family="Segoe UI, system-ui, sans-serif" font-size="18" fill="#64748b">Tabs · Selections · Snippets · File metadata · Optional PWA</text>
</svg>`;

async function writePng(name, svg) {
  const out = path.join(outDir, name);
  await sharp(Buffer.from(svg))
    .flatten({ background: { r: 245, g: 243, b: 255 } })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(out);
  const m = await sharp(out).metadata();
  console.log(name, `${m.width}x${m.height}`, 'alpha', m.hasAlpha);
}

await writePng('promo-small-440x280.png', smallSvg);
await writePng('promo-marquee-1400x560.png', marqueeSvg);
console.log('Wrote', outDir);
