import { cp, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'extension/manifest.json'), 'utf8'));
await mkdir(resolve(root, 'dist/sozlook'), { recursive: true });
await cp(resolve(root, 'extension'), resolve(root, 'dist/sozlook'), { recursive: true });
console.log(`Sözlook ${manifest.version} hazır: dist/sozlook (Chrome → Paketlenmemiş öğe yükle)`);
