import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.join(__dirname, '..');
const distDir = path.join(extRoot, 'dist');
const outFile = path.join(extRoot, 'sortmysources-extension.zip');

if (!fs.existsSync(distDir)) {
  console.error('Missing dist/. Run npm run build in sortmysources-extension first.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(extRoot, 'package.json'), 'utf8'));

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(outFile);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', resolve);
  archive.on('error', reject);
  archive.pipe(output);
  archive.directory(distDir, false);
  archive.finalize();
});

console.log(`Wrote ${outFile} (${pkg.version ?? '?'})`);
