// Logowanie hasłem do panelu /admin (zamiast konta GitHub).
// Panel (Sveltia/Decap CMS) otwiera to okno, a po poprawnym haśle dostaje token zapisu do repozytorium,
// który leży tylko w zmiennej środowiskowej Netlify (GITHUB_TOKEN) – edytor go nie widzi i nie zna.
// Zmienne w Netlify: ADMIN_PASSWORD (hasło edytora), GITHUB_TOKEN (fine-grained token tylko do tego repo, Contents: Read and write).
import { timingSafeEqual, createHash } from 'node:crypto';

const ALLOWED_ORIGINS = ['https://ogrodnictwoluczak.pl', 'https://www.ogrodnictwoluczak.pl', 'https://ogrodnictwwo.netlify.app'];
const sha = (s) => createHash('sha256').update(String(s)).digest();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const page = (body) => new Response(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Logowanie – panel oferty</title>
<style>body{font-family:system-ui,sans-serif;background:#f3f6f2;display:grid;place-items:center;min-height:100vh;margin:0}
form,div.box{background:#fff;padding:2rem;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.08);width:min(340px,90vw)}
h1{font-size:1.2rem;margin:0 0 1rem;color:#042217}input{width:100%;box-sizing:border-box;padding:.7rem;font-size:1rem;border:1px solid #9aa8a0;border-radius:8px;margin-bottom:.8rem}
button{width:100%;padding:.75rem;font-size:1rem;font-weight:700;background:#042217;color:#fff;border:0;border-radius:8px;cursor:pointer}.err{color:#b3261e;margin:0 0 .8rem}</style></head><body>${body}</body></html>`,
  { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });

const form = (err) => page(`<form method="post"><h1>Panel oferty – logowanie</h1>${err ? `<p class="err">${esc(err)}</p>` : ''}<input type="password" name="password" placeholder="Hasło" autocomplete="current-password" autofocus required><button type="submit">Zaloguj</button></form>`);

export default async (req) => {
  if (!process.env.ADMIN_PASSWORD || !process.env.GITHUB_TOKEN) return page('<div class="box"><h1>Brak konfiguracji</h1><p>Ustaw w Netlify zmienne ADMIN_PASSWORD i GITHUB_TOKEN.</p></div>');
  if (req.method !== 'POST') return form();

  const data = await req.formData().catch(() => null);
  const password = data?.get('password') ?? '';
  if (!timingSafeEqual(sha(password), sha(process.env.ADMIN_PASSWORD))) {
    await new Promise((r) => setTimeout(r, 1500)); // spowalnia zgadywanie hasła
    return form('Nieprawidłowe hasło.');
  }

  const payload = JSON.stringify({ token: process.env.GITHUB_TOKEN, provider: 'github' }).replace(/</g, '\u003c');
  return page(`<div class="box"><h1>Zalogowano</h1><p>Za chwilę to okno się zamknie.</p></div><script>
(function () {
  var allowed = ${JSON.stringify(ALLOWED_ORIGINS)}.concat(location.origin.indexOf('localhost') > -1 ? [location.origin] : []);
  window.addEventListener('message', function (e) {
    if (e.data === 'authorizing:github' && allowed.indexOf(e.origin) > -1) {
      window.opener.postMessage('authorization:github:success:' + ${JSON.stringify(payload)}, e.origin);
    }
  });
  window.opener && window.opener.postMessage('authorizing:github', '*');
})();
</script>`);
};

export const config = { path: '/admin-auth' };
