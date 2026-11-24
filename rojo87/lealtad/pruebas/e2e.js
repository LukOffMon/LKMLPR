// Pruebas de punta a punta de la lealtad de Rojo 87 con la API simulada (no toca la base de datos real).
// Uso: python -m http.server 8000 (desde LKMLPR) y node rojo87/lealtad/pruebas/e2e.js capturas
// PW_CHANNEL=msedge para usar Edge en lugar del Chromium de Playwright.
const { chromium } = require('playwright');
const OUT = process.argv[2] || 'capturas';
require('fs').mkdirSync(OUT, { recursive: true });
const BASE = process.env.ROJO87_URL || 'http://localhost:8000/rojo87/lealtad/';
const API = 'https://lsvyryanshcuysowlysp.supabase.co/functions/v1/rojo87/api';

const day = 86400000;
const merchant = {
  id: 'm1', name: 'Barbería Don Luis', slug: 'barberia-don-luis', logo_png: null,
  color_bg: '#1b2a41', color_fg: '#ffffff', color_accent: '#f4b942', reward_text: 'Corte gratis',
  stamps_required: 8, ticket_avg: 180, inactive_days: 30, stamp_cooldown_min: 30,
  address: 'Av. Universidad 123, Aguascalientes', lat: '', lng: '', plan: 'trial',
  status: 'active', plan: 'pro', paid_until: new Date(Date.now() + 40 * day).toISOString(), has_staff_pin: true, design: {}, nearby: 'inactive',
};
let account = { state: 'active', status: 'active', plan: 'pro', plan_name: 'Pro', paid_until: new Date(Date.now() + 40 * day).toISOString(), contact_whatsapp: '4492094034' };
const stats = { customers: 42, new_30d: 12, visits_30d: 96, inactive: 9, near_reward: 5, redeemed_30d: 7, recovered_revenue_30d: 4860, reactivated_30d: 27, rewards_pending: 3, opted_in: 30 };
const daily = Array.from({ length: 14 }, (_, i) => ({ day: new Date(Date.now() - (13 - i) * day).toISOString().slice(0, 10), visits: [3, 5, 2, 8, 6, 9, 4, 7, 10, 5, 6, 12, 8, 9][i] }));
const recent = [
  { kind: 'stamp', name: 'Jorge Ramírez', created_at: new Date(Date.now() - 600000).toISOString(), staff_name: 'Luis', meta: { reactivated: true } },
  { kind: 'join', name: 'Ana Torres', created_at: new Date(Date.now() - 3600000).toISOString(), meta: {} },
  { kind: 'redeem', name: 'Marco Pérez', created_at: new Date(Date.now() - day).toISOString(), meta: { unlocked: true } },
  { kind: 'campaign', created_at: new Date(Date.now() - 2 * day).toISOString(), meta: { recipients: 9 } },
];
const customers = [
  { serial: 'S1', name: 'Jorge Ramírez', phone: '4491234567', stamps: 6, total_visits: 14, last_visit_at: new Date(Date.now() - 41 * day).toISOString(), days_since: 41, rewards_available: 0, marketing_opt_in: true },
  { serial: 'S2', name: 'Ana Lucía Torres', phone: '4497654321', stamps: 7, total_visits: 7, last_visit_at: new Date(Date.now() - 3 * day).toISOString(), days_since: 3, rewards_available: 0, marketing_opt_in: false },
  { serial: 'S3', name: 'Marco Pérez', phone: '4490001111', stamps: 0, total_visits: 9, last_visit_at: new Date(Date.now() - day).toISOString(), days_since: 1, rewards_available: 1, marketing_opt_in: true },
];
let card = { serial: 'CARD-0001-XYZ', name: 'Marco Pérez', stamps: 5, rewards_available: 0, message: 'Esta semana tu sello va doble.', total_visits: 9, last_visit_at: new Date(Date.now() - day).toISOString(), updated_at: '1' };
let stampCalls = 0;
let lastPut = null;

const json = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
async function mockApi(page) {
  await page.route(API + '/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace('/functions/v1/rojo87/api', '');
    const m = req.method();
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (p === '/signup' || p === '/login' || p === '/staff-login') return json(route, { token: 'tok' });
    if (p === '/logout') return json(route, { ok: true });
    if (p === '/me') return json(route, { role: 'owner', merchant, stats, daily, recent, account });
    if (p === '/customers') return json(route, { customers: url.searchParams.get('filter') === 'inactive' ? customers.slice(0, 1) : customers, inactive_days: 30 });
    if (p === '/campaigns' && m === 'GET') return json(route, { campaigns: [{ message: '¡Te extrañamos! Ven esta semana.', segment: 'inactive', recipients: 9, created_at: new Date(Date.now() - 2 * day).toISOString() }] });
    if (p === '/campaigns') return json(route, { recipients: 9 });
    if (p === '/merchant') { lastPut = JSON.parse(req.postData() || '{}'); Object.assign(merchant, lastPut); return json(route, { merchant }); }
    if (p === '/lookup') return json(route, { customer: customers[2], stamps_required: 8, reward_text: 'Corte gratis' });
    if (p === '/stamp') {
      stampCalls++;
      if (stampCalls === 1) return json(route, { cooldown: true, minutes_ago: 3 });
      return json(route, { customer: { ...customers[2], stamps: 1 }, stamps_required: 8, unlocked: false, reactivated: true });
    }
    if (p === '/redeem') return json(route, { customer: customers[2] });
    if (p === '/public/m/barberia-don-luis') return json(route, { merchant: { ...merchant, accepting: true } });
    if (p === '/public/m/no-existe') return json(route, { error: 'No encontrado' }, 404);
    if (p === '/public/m/barberia-don-luis/join') return json(route, { serial: card.serial });
    if (p === `/public/card/${card.serial}/google`) return json(route, { url: BASE + 'aviso.html#google' });
    if (p === `/public/card/${card.serial}`) return json(route, { merchant, card, wallet: { apple: false, google: true } });
    return json(route, { error: 'ruta no simulada ' + p }, 404);
  });
}

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };

async function audit(page, tag) {
  const r = await page.evaluate(() => {
    const vis = (e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden'; };
    const small = [...document.querySelectorAll('a,button,summary,input,select')].filter(vis).filter((e) => {
      const b = e.getBoundingClientRect();
      const inline = e.tagName === 'A' && getComputedStyle(e).display === 'inline';
      return !inline && e.type !== 'checkbox' && b.height < 40;
    }).map((e) => `${e.tagName}:${(e.textContent || e.name || '').trim().slice(0, 24)}:${Math.round(e.getBoundingClientRect().height)}`);
    const wide = [...document.querySelectorAll('body *')].filter((e) => vis(e) && e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.tabs,.chips')).slice(0, 5).map((e) => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right));
    return { wide, overflow: document.documentElement.scrollWidth - innerWidth, small, font: getComputedStyle(document.body).fontFamily, h1: document.querySelectorAll('h1').length };
  });
  check(`${tag}: sin desbordamiento horizontal`, r.overflow <= 0, `${r.overflow}px ${r.wide.join(', ')}`);
  check(`${tag}: áreas táctiles de 40 px o más`, r.small.length === 0, r.small.join(', '));
  return r;
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  for (const vp of [{ w: 375, h: 812, tag: 'móvil' }, { w: 1280, h: 860, tag: 'escritorio' }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, permissions: ['camera', 'geolocation'], geolocation: { latitude: 21.88, longitude: -102.29 } });
    const newPage = async () => {
      const p = await ctx.newPage();
      p.errors = [];
      p.on('pageerror', (e) => p.errors.push(String(e)));
      p.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && p.errors.push(m.text()));
      await mockApi(p);
      return p;
    };
    const shot = (p, name) => p.screenshot({ path: `${OUT}/${vp.tag}-${name}.png`, fullPage: true });
    const T = vp.tag;

    // Portada de la lealtad (entrada para dueño, equipo y cliente)
    let p = await newPage();
    await p.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    check(`${T} portada: carga Anton para titulares`, await p.evaluate(() => document.fonts.check('400 16px Anton')));
    check(`${T} portada: tres entradas`, (await p.locator('.door').count()) === 3);
    check(`${T} portada: el logo lleva al sitio de Rojo 87`, (await p.getAttribute('.logo-r87', 'href')) === '../');
    await audit(p, `${T} portada`);
    await shot(p, 'portada');
    check(`${T} portada: sin errores JS`, p.errors.length === 0, p.errors.join(' | '));
    await p.close();

    // Alta prellenada desde el QR de prueba
    p = await newPage();
    await p.goto(BASE + 'panel.html?lugar=Tacos%20El%20G%C3%BCero&giro=fonda', { waitUntil: 'networkidle' });
    check(`${T} panel: QR de prueba prellena el alta`, (await p.inputValue('#signupForm [name=name]')) === 'Tacos El Güero' && (await p.inputValue('#signupForm [name=vertical]')) === 'fonda');
    await p.close();

    // Panel: registro y todas las pestañas
    p = await newPage();
    await p.goto(BASE + 'panel.html', { waitUntil: 'networkidle' });
    await audit(p, `${T} panel acceso`);
    await shot(p, 'panel-acceso');
    await p.fill('#signupForm [name=name]', 'Barbería Don Luis');
    await p.fill('#signupForm [name=email]', 'luis@ejemplo.com');
    await p.fill('#signupForm [name=password]', 'secreta123');
    await p.evaluate(() => { localStorage.setItem('r87_pick_theme', 'cafe'); localStorage.setItem('r87_pick_icon', 'corazon'); });
    await p.click('#signupForm button[type=submit]');
    await p.waitForSelector('#appView:not(.hidden)');
    check(`${T} panel: registro abre "Mi tarjeta"`, await p.locator('[data-view=card]').isVisible());
    check(`${T} panel: aplica un tema guardado antes del registro`, await p.locator('[data-theme-id=cafe][aria-pressed=true]').count() === 1 && await p.locator('[data-icon=corazon][aria-pressed=true]').count() === 1);
    await p.waitForSelector('.tour .tour-tip');
    check(`${T} tutorial: arranca solo al crear la cuenta`, /Paso 1 de 7/.test(await p.textContent('.tour-count')));
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${T}-tutorial-paso1.png` });
    for (let k = 0; k < 4; k++) { await p.click('.tour [data-t=next]'); await p.waitForTimeout(150); }
    check(`${T} tutorial: avanza a la vista previa`, /Pruébala/.test(await p.textContent('#tourTitle')));
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${T}-tutorial-paso5.png` });
    await p.click('.tour [data-t=prev]');
    check(`${T} tutorial: regresa un paso`, /Paso 4 de 7/.test(await p.textContent('.tour-count')));
    for (let k = 0; k < 4; k++) { await p.click('.tour [data-t=next]'); await p.waitForTimeout(100); }
    check(`${T} tutorial: termina y no vuelve a salir`, (await p.locator('.tour').count()) === 0 && (await p.evaluate(() => localStorage.getItem('r87_tour_done'))) === '1');
    await p.click('[data-theme-id=noche]');
    check(`${T} editor: el tema cambia la tarjeta`, await p.locator('#cardPreview.loyalty.font-maquina.pat-cuadricula').count() === 1);
    await p.click('[data-icon=tijeras]');
    await p.click('[data-opt=stamp] [data-value=relleno]');
    await p.click('#testStamp');
    check(`${T} editor: probar un sello suma uno`, (await p.locator('#cardPreview .stamp.on').count()) === 4);
    check(`${T} editor: logo disponible con plan pagado`, await p.locator('#logoFile').count() === 1);
    await p.selectOption('#cardForm [name=nearby]', 'all');
    await p.fill('#cardForm [name=reward_text]', 'Corte y barba gratis');
    check(`${T} panel: vista previa se actualiza`, /Corte y barba gratis/.test(await p.textContent('#cardPreview')));
    await shot(p, 'panel-tarjeta');
    await p.click('#cardForm button[type=submit]');
    await p.waitForSelector('#toast.show');
    check(`${T} panel: guardar tarjeta`, /guardada/.test(await p.textContent('#toast')));
    check(`${T} panel: guarda diseño y recordatorio`, lastPut && lastPut.design.theme === 'propio' && lastPut.design.icon === 'tijeras' && lastPut.design.stamp === 'relleno' && lastPut.nearby === 'all');
    await p.click('#appView .topbar [data-theme-picker] summary');
    await p.click('#appView .topbar [data-site-theme=oscuro]');
    check(`${T} tema de la web: oscuro`, (await p.evaluate(() => document.documentElement.dataset.theme)) === 'oscuro' && (await p.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(11, 11, 11)');
    await p.click('[data-tab=card]');
    await shot(p, 'panel-tarjeta-oscuro');
    await p.click('#appView .topbar [data-theme-picker] summary');
    await p.click('#appView .topbar [data-site-theme=auto]');
    await p.click('[data-tab=home]');
    check(`${T} panel: indicadores`, (await p.locator('.kpi').count()) === 6 && /4,860/.test(await p.textContent('#kpis')));
    check(`${T} panel: gráfica de 14 días`, (await p.locator('#bars div').count()) === 14);
    await audit(p, `${T} panel inicio`);
    await shot(p, 'panel-inicio');
    await p.click('[data-tab=customers]');
    await p.waitForSelector('#custList .item');
    check(`${T} panel: lista de clientes`, (await p.locator('#custList .item').count()) === 3);
    await p.click('[data-filter=inactive]');
    await p.waitForFunction(() => document.querySelectorAll('#custList .item').length === 1);
    check(`${T} panel: filtro de inactivos`, true);
    await shot(p, 'panel-clientes');
    await p.click('#winbackBtn');
    check(`${T} panel: recuperar inactivos llena la campaña`, /extrañamos/.test(await p.inputValue('#campMsg')));
    await p.click('#campForm button[type=submit]');
    await p.waitForFunction(() => /9 cliente/.test(document.getElementById('toast').textContent));
    check(`${T} panel: enviar campaña`, true);
    await shot(p, 'panel-campanas');
    await p.click('[data-tab=counter]');
    check(`${T} panel: QR de alta`, (await p.locator('#joinQr svg').count()) === 1 && /unirse\.html\?m=barberia-don-luis/.test(await p.inputValue('#joinLink')));
    await audit(p, `${T} panel mostrador`);
    await shot(p, 'panel-mostrador');
    account = { ...account, state: 'pending', status: 'pending', deletes_at: new Date(Date.now() + 6 * 3600000).toISOString() };
    const paid = merchant.paid_until; merchant.paid_until = null;
    await p.evaluate(() => { location.hash = 'card'; });
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForSelector('#logoBox .locked');
    check(`${T} editor: logo bloqueado hasta pagar`, await p.locator('#logoFile').count() === 0 && /Activar mi plan/.test(await p.textContent('#logoBox')));
    await shot(p, 'panel-logo-bloqueado');
    account = { ...account, state: 'active', status: 'active' }; merchant.paid_until = paid;
    check(`${T} panel: sin errores JS`, p.errors.length === 0, p.errors.join(' | '));
    await p.close();

    // Unirse
    p = await newPage();
    await p.goto(BASE + 'unirse.html?m=no-existe', { waitUntil: 'networkidle' });
    check(`${T} unirse: negocio inexistente`, await p.locator('#notfound').isVisible());
    p.errors = [];
    await p.goto(BASE + 'unirse.html?m=barberia-don-luis', { waitUntil: 'networkidle' });
    check(`${T} unirse: casilla de promociones desmarcada`, !(await p.isChecked('[name=marketing_opt_in]')));
    await audit(p, `${T} unirse`);
    await shot(p, 'unirse');
    await p.fill('[name=name]', 'Marco Pérez');
    await p.fill('[name=phone]', '4490001111');
    await p.click('#form button[type=submit]');
    check(`${T} unirse: pide aceptar el aviso`, await p.locator('#err').isVisible());
    await p.check('[name=accept_terms]');
    await p.click('#form button[type=submit]');
    await p.waitForURL(/tarjeta\.html/);
    await p.waitForSelector('#view:not(.hidden)');
    check(`${T} tarjeta: llega desde unirse con bienvenida`, await p.locator('#welcome').isVisible());
    check(`${T} tarjeta: 5 sellos y mensaje del negocio`, (await p.locator('#card .stamp.on').count()) === 5 && await p.locator('#msgBanner').isVisible());
    check(`${T} tarjeta: QR del cliente`, (await p.locator('#card .qr svg').count()) === 1);
    check(`${T} tarjeta: página con los colores del negocio`, await p.evaluate(() => document.documentElement.classList.contains('page-marca')) === (merchant.design && merchant.design.page === 'marca'));
    check(`${T} tarjeta: usa el diseño del negocio`, await p.locator('#card.loyalty.font-maquina').count() === 1);
    await audit(p, `${T} tarjeta`);
    await shot(p, 'tarjeta');
    // El negocio sella: la tarjeta se actualiza sola
    card = { ...card, stamps: 8, rewards_available: 1, updated_at: '2' };
    await p.waitForSelector('#rewardBanner:not(.hidden)', { timeout: 9000 });
    check(`${T} tarjeta: se actualiza sola y muestra el premio`, true);
    await p.waitForTimeout(800);
    await shot(p, 'tarjeta-premio');
    card = { ...card, stamps: 5, rewards_available: 0, updated_at: '1' };
    check(`${T} tarjeta: sin errores JS`, p.errors.length === 0, p.errors.join(' | '));
    await p.close();

    // Sellar
    stampCalls = 0;
    p = await newPage();
    await p.goto(BASE + 'aviso.html');
    await p.evaluate(() => localStorage.clear());
    await p.goto(BASE + 'sellar.html?m=barberia-don-luis', { waitUntil: 'networkidle' });
    check(`${T} sellar: código del negocio precargado`, (await p.inputValue('[name=slug]')) === 'barberia-don-luis');
    await audit(p, `${T} sellar acceso`);
    await shot(p, 'sellar-acceso');
    await p.fill('[name=pin]', '1234');
    await p.fill('[name=staff_name]', 'Luis');
    await p.click('#loginForm button');
    await p.waitForSelector('#scanView:not(.hidden)');
    await p.waitForTimeout(800);
    await shot(p, 'sellar-escaner');
    await p.fill('#manualForm [name=code]', '4490001111');
    await p.click('#manualForm button');
    await p.waitForSelector('#sheet.open #doStamp');
    check(`${T} sellar: buscar por teléfono abre al cliente`, /Marco/.test(await p.textContent('#sheetBody')));
    await p.waitForTimeout(400);
    await shot(p, 'sellar-cliente');
    await p.click('#doStamp');
    await p.waitForSelector('#force');
    check(`${T} sellar: antifraude pide confirmar`, /hace 3 min/.test(await p.textContent('#sheetBody')));
    await p.click('#force');
    await p.waitForSelector('#next');
    check(`${T} sellar: sello agregado y cliente recuperado`, /Sello agregado/.test(await p.textContent('#sheetBody')) && /recuperado/.test(await p.textContent('#sheetBody')));
    await p.waitForTimeout(600);
    await shot(p, 'sellar-listo');
    await p.click('#next');
    await p.fill('#manualForm [name=code]', '4490001111');
    await p.waitForTimeout(700);
    await p.click('#manualForm button');
    await p.waitForSelector('#doRedeem');
    await p.click('#doRedeem');
    await p.waitForFunction(() => /Premio canjeado/.test(document.getElementById('sheetBody').textContent));
    check(`${T} sellar: canjear premio`, true);
    check(`${T} sellar: sin errores JS`, p.errors.length === 0, p.errors.join(' | '));
    await p.close();

    // Llave maestra (solo la pantalla de acceso)
    p = await newPage();
    await p.goto(BASE + 'llave-maestra.html', { waitUntil: 'networkidle' });
    await audit(p, `${T} llave maestra`);
    await shot(p, 'llave-maestra');
    check(`${T} llave maestra: sin errores JS`, p.errors.length === 0, p.errors.join(' | '));
    await p.close();

    // Aviso
    p = await newPage();
    await p.goto(BASE + 'aviso.html', { waitUntil: 'networkidle' });
    await audit(p, `${T} aviso`);
    await shot(p, 'aviso');
    await p.close();
    await ctx.close();
  }
  await browser.close();
  const bad = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? 'OK ' : 'FALLA'} ${r.name}${r.ok ? '' : '  -> ' + r.detail}`);
  console.log(`\n${results.length - bad.length}/${results.length} pruebas pasaron`);
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
