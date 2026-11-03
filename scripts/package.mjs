// Chrome Web Store yükleme paketi: dist/sozlook-<sürüm>.zip (manifest.json ZIP kökünde).
import { execFileSync } from 'node:child_process';
import { readFile, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'extension/manifest.json'), 'utf8'));
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));

if (manifest.version !== pkg.version) {
  console.error(`Sürüm uyuşmuyor: manifest.json ${manifest.version}, package.json ${pkg.version}. İkisini de aynı yap.`);
  process.exit(1);
}
if (manifest.description.length > 132) {
  console.error(`manifest.json açıklaması ${manifest.description.length} karakter; mağaza sınırı 132.`);
  process.exit(1);
}

execFileSync(process.execPath, [resolve(root, 'scripts/build.mjs')], { stdio: 'inherit' });

const zip = resolve(root, `dist/sozlook-${manifest.version}.zip`);
await rm(zip, { force: true });
execFileSync('zip', ['-r', '-X', '-q', zip, '.', '-x', '.*', '*/.*'], { cwd: resolve(root, 'dist/sozlook'), stdio: 'inherit' });

const listing = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n').filter(Boolean);
if (!listing.includes('manifest.json')) { console.error('ZIP kökünde manifest.json yok.'); process.exit(1); }

const { size } = await stat(zip);
console.log(`Mağaza paketi hazır: dist/sozlook-${manifest.version}.zip (${listing.length} dosya, ${(size / 1024).toFixed(1)} KB)`);
console.log('Yükle: https://chrome.google.com/webstore/devconsole');
