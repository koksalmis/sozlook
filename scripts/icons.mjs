import sharp from 'sharp';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const svg = await readFile(resolve(root, 'extension/brand/mark.svg'));
const paths = svg.toString().replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replaceAll('fill="#1764ed"', 'fill="currentColor" stroke="none"').replaceAll('fill="#fff"', 'fill="var(--sozlook-mark-cutout, #fff)" stroke="none"');
await writeFile(resolve(root, 'extension/brand/mark.js'), `// Generated from mark.svg by npm run icons.\nglobalThis.SozlookBrand = { paths: ${JSON.stringify(paths)} };\n`);
await mkdir(resolve(root, 'extension/icons'), { recursive: true });
for (const size of [16, 32, 48, 128]) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(resolve(root, `extension/icons/icon${size}.png`));
}
console.log('Sözlook · Kelime işareti: 16, 32, 48 ve 128 px ikonlar hazır.');
