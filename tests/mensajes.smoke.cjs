// Prueba de humo del macro de ventas (mensajes/). Uso: node tests/mensajes.smoke.cjs
// Levanta un servidor local, bloquea la red externa (Supabase, WhatsApp, mapas) y recorre los flujos
// principales en un celular de 390 px. Sale con código 1 si algo falla.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let fallas = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallas++; };

(async () => {
  await new Promise(r => server.listen(0, 'localhost', r));
  const URL = `http://localhost:${server.address().port}/mensajes/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Mexico_City', acceptDownloads: true });
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await ctx.route(u => !u.href.startsWith(`http://localhost:${server.address().port}`), r => r.abort());
  await p.clock.install({ time: new Date('2026-11-18T11:00:00-06:00') });
  await p.goto(URL);

  ok(await p.isVisible('#pin-i'), 'pide PIN al entrar');
  await p.fill('#pin-i', '1987'); await p.waitForTimeout(800);
  ok(await p.$eval('#m-tour', d => d.open), 'la primera vez abre el tutorial');
  await p.click('#m-tour-next'); await p.fill('#m-tour-yo', 'Socio Prueba');
  for (let i = 0; i < 4; i++) await p.click('#m-tour-next');
  await p.click('#m-tour-next'); await p.waitForTimeout(500);
  ok(await p.$eval('#m-notif', d => d.open), 'después del tutorial avisa de nuevos posibles clientes');
  const n = await p.$$eval('#m-notif-list li', a => a.length);
  ok(n > 0, `el aviso lista ${n} prospectos nuevos`);
  const tiers = await p.$$eval('#m-notif-list .m-tier', a => a.map(x => x.textContent));
  const sinWA = tiers.findIndex(t => /llamar/i.test(t));
  ok(sinWA === -1 || tiers.slice(sinWA).every(t => /llamar/i.test(t)), 'en el aviso van primero los que tienen WhatsApp');
  await p.click('#m-notif-ok');

  ok(await p.isVisible('#hoy') && !(await p.isVisible('#prospectos')), 'abre en la vista Hoy, una sección a la vez');
  ok(await p.isVisible('.m-tabbar'), 'en celular hay barra inferior de vistas');
  for (const v of ['prospectos', 'pagos', 'mapa', 'mas', 'hoy']) {
    await p.click(`.m-tabbar [data-go="${v}"]`); await p.waitForTimeout(150);
    const vis = await p.$$eval('[data-views]', a => a.filter(e => !e.hidden).map(e => e.dataset.views));
    ok(vis.length && vis.every(x => x.split(' ').includes(v)), `vista ${v}: ${vis.length} sección(es)`);
  }
  await p.click('.m-tabbar [data-go="mas"]'); await p.click('#mas [data-go="ajustes"]');
  ok(await p.isVisible('#ajustes #firma') && await p.inputValue('#firma') === 'Socio Prueba', 'Ajustes reúne tu nombre, firma y precios');
  ok(await p.isVisible('#ajustes #g-limite'), 'Ajustes reúne los límites de envío');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#aj-export')]);
  const resp = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  ok(resp.app === 'lkm-macro' && !('lkm-pin' in resp.datos) && !('lkm-macro-estado' in resp.datos), 'el respaldo se descarga sin PIN ni avance de la nube');

  await p.click('.m-tabbar [data-go="prospectos"]');
  await p.fill('#m-q', 'Taco Sireno'); await p.waitForTimeout(200);
  ok((await p.$$eval('.m-row .m-name', a => a.map(x => x.textContent))).includes('Taco Sireno'), 'el buscador encuentra un prospecto');
  ctx.on('page', pg => pg.close().catch(() => {}));
  const wa = []; ctx.on('request', r => { if (/wa\.me|whatsapp/.test(r.url())) wa.push(decodeURIComponent(r.url())); });
  await p.click('.m-row [data-act="inicial"]'); await p.waitForTimeout(400);
  ok(wa.length && !/https?:\/\/lukoffmon/.test(wa[0].split('text=')[1] || ''), 'el contacto inicial no lleva enlace');
  await p.click('.m-row [data-act="contesto"]'); await p.waitForTimeout(200);
  await p.click('.m-row [data-act="venta"]'); await p.waitForTimeout(400);
  const venta = wa[wa.length - 1] || '';
  ok(/menus-qr\/taco-sireno\//.test(venta) && /menus-qr\/taco-sireno\/qr\//.test(venta) && /\$650/.test(venta), 'la venta lleva su menú, su QR y el precio');

  await p.keyboard.press('Escape'); await p.click('body');
  await p.keyboard.press('3'); await p.waitForTimeout(150);
  ok(await p.isVisible('#pagos'), 'el atajo 3 abre Pagos');
  await p.reload(); await p.waitForTimeout(800);
  ok(!(await p.$eval('#m-tour', d => d.open)) && !(await p.$eval('#m-notif', d => d.open)), 'al recargar no repite tutorial ni aviso');
  ok(await p.isVisible('#pagos'), 'al recargar conserva la vista');
  const [sw, vw] = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  ok(sw <= vw, `sin desborde horizontal (${sw}px en ${vw}px)`);

  await p.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready);
  await ctx.setOffline(true); await p.reload().catch(() => {}); await p.waitForTimeout(800);
  ok(await p.isVisible('#pagos'), 'sin internet abre la última versión guardada');
  await ctx.setOffline(false);
  ok(!errs.length, `sin errores de JavaScript${errs.length ? ': ' + errs.join(' | ') : ''}`);
  await b.close(); server.close();
  console.log(fallas ? `\n${fallas} fallas` : '\nTodo correcto');
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
