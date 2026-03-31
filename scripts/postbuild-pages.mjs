import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve('dist');
const indexHtml = resolve(distDir, 'index.html');
const notFoundHtml = resolve(distDir, '404.html');
const noJekyll = resolve(distDir, '.nojekyll');

if (!existsSync(distDir) || !existsSync(indexHtml)) {
  throw new Error('dist/index.html was not found. Run the Vite build before the postbuild step.');
}

mkdirSync(distDir, { recursive: true });
copyFileSync(indexHtml, notFoundHtml);
writeFileSync(noJekyll, '');
