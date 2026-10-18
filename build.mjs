// Generuje index.html i sitemap.xml z content/odmiany/*.json + index.src.html.
// Wynik trafia do folderu dist/ (publikowanego przez Netlify). Uruchamiane przy każdym wdrożeniu oraz lokalnie: npm run build
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SITE = 'https://ogrodnictwoluczak.pl';
const SIZE_LABEL = { drobnokwiatowa: 'drobnokwiatowa', sredniokwiatowa: 'średniokwiatowa', wielkokwiatowa: 'wielkokwiatowa' };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plural = (n, a, b, c) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? b : c);
// jednoliterowe spójniki/przyimki nie mogą zostać na końcu wiersza
const nbsp = (s) => s.replace(/\u00a0/g, ' ').replace(/(^|\s)([aiouwzAIOUWZ]) (?=\S)/g, '$1$2&nbsp;');
const clean = (p) => p.replace(/^\/+/, '');
const exists = (p) => fs.existsSync(p);

const GEN = 'img/gen';
fs.mkdirSync(GEN, { recursive: true });
const baseName = (p) => clean(p).replace(/^img\//, '').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

// Zdjęcie na kartę (4:3): gotowe webp z wariantem -400 jest używane bez zmian, resztę (np. wgrane z telefonu) przetwarzamy.
async function cardImage(photo) {
  const p = clean(photo);
  const pre = p.replace(/\.webp$/, '-400.webp');
  if (p.endsWith('.webp') && exists(pre)) return { src: p, small: pre };
  const name = baseName(p);
  const big = `${GEN}/${name}-800.webp`, small = `${GEN}/${name}-400.webp`;
  if (!exists(big) || fs.statSync(big).mtimeMs < fs.statSync(p).mtimeMs) {
    const img = sharp(p).rotate();
    await img.clone().resize(800, 600, { fit: 'cover', position: 'attention' }).webp({ quality: 80 }).toFile(big);
    await img.clone().resize(400, 300, { fit: 'cover', position: 'attention' }).webp({ quality: 80 }).toFile(small);
  }
  return { src: big, small };
}
// Zdjęcie do galerii (zachowuje proporcje, max 1000x1333)
async function galleryImage(photo) {
  const p = clean(photo);
  if (p.endsWith('.webp') && !p.startsWith('img/uploads/')) return p;
  const out = `${GEN}/${baseName(p)}-g.webp`;
  if (!exists(out) || fs.statSync(out).mtimeMs < fs.statSync(p).mtimeMs) {
    await sharp(p).rotate().resize(1000, 1333, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
  }
  return out;
}

const dir = 'content/odmiany';
const items = [];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const o = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!o.title || !o.photo || !exists(clean(o.photo))) { console.warn(`Pominięto ${f}: brak tytułu lub zdjęcia`); continue; }
  items.push(o);
}
items.sort((a, b) => a.title.localeCompare(b.title, 'pl'));

const photoWord = (n) => plural(n, 'zdjęcie', 'zdjęcia', 'zdjęć');
const PHOTO_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="3" width="14" height="14" rx="2"/><path d="M3 7v12a2 2 0 0 0 2 2h12"/><path d="m7 14 3.5-3.5L15 15l2-2 4 4"/></svg>';

const cards = [];
const sitemapImages = [];
for (const [i, o] of items.entries()) {
  const main = await cardImage(o.photo);
  const gallery = [];
  for (const g of o.gallery || []) { if (exists(clean(g))) gallery.push(await galleryImage(g)); }
  const title = esc(o.title);
  const alt = `Chryzantema ${SIZE_LABEL[o.size] || o.size} ${title} w doniczce`;
  const purposes = o.purposes?.length ? o.purposes : ['hurt', 'detal'];
  const chip = purposes.includes('hurt') ? '\n                  <span class="chip chip--primary">Dostępne w&nbsp;hurcie</span>' : '';
  const total = gallery.length + 1;
  const badge = gallery.length
    ? `\n                <span class="product__chip-bottom chip chip--photos" aria-hidden="true">${PHOTO_ICON}${total}&nbsp;${photoWord(total)}</span>` : '';
  const galleryAttr = gallery.length ? ` data-gallery="${esc(gallery.join('|'))}"` : '';
  cards.push(`            <article class="product" data-order="${i + 1}" data-size="${o.size}" data-color="${(o.colors || []).join(' ')}" data-shape="${o.shape}" data-purpose="${purposes.join(' ')}"${galleryAttr}>
              <div class="product__media">
                <img src="${main.src}" srcset="${main.small} 400w, ${main.src} 800w" sizes="(min-width: 1024px) 380px, 45vw" alt="${alt}" width="800" height="600" loading="lazy" decoding="async">
                <div class="product__chips">${chip}
                </div>${badge}
              </div>
              <div class="product__body">
                <div class="product__info">
                  <h3 class="product__title">${title}</h3>
                  <p class="product__desc">${nbsp(esc(o.description || ''))}</p>
                </div>
              </div>
            </article>

`);
  for (const src of [main.src, ...gallery]) sitemapImages.push([src, alt]);
}

const count = items.length;
const countText = `${count} ${plural(count, 'wariant', 'warianty', 'wariantów')}`;
const html = fs.readFileSync('index.src.html', 'utf8')
  .replace('<!--@PRODUCTS@-->\n', cards.join(''))
  .replaceAll('{{COUNT_TEXT}}', countText)
  .replaceAll('{{COUNT}}', String(count));
const OUT = 'dist';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const f of ['404.html', 'robots.txt', 'css', 'js', 'fonts', 'img', 'admin']) {
  if (exists(f)) fs.cpSync(f, `${OUT}/${f}`, { recursive: true, filter: (src) => !src.split(path.sep).join('/').startsWith('img/uploads') });
}
fs.writeFileSync(`${OUT}/index.html`, html);

const today = new Date().toISOString().slice(0, 10);
const imgXml = sitemapImages.map(([src, t]) => `    <image:image><image:loc>${SITE}/${src}</image:loc><image:title>${t}</image:title></image:image>\n`).join('');
fs.writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
${imgXml}  </url>
</urlset>
`);
console.log(`OK: ${count} odmian, ${sitemapImages.length} zdjęć w sitemapie`);
