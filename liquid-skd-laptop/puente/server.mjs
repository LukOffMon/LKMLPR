// Puente de Liquid SKd: une Liquid (la web) con slskd (Soulseek) en tu servidor.
// - Liquid nunca habla con slskd: solo con este puente, que pide una clave (LIQUID_CLAVE).
// - Buscar en Soulseek, pedir una descarga, ver cómo va y escuchar lo descargado.
// - Sin dependencias: solo Node 20+ (http, fs, crypto, fetch).
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export function crearPuente(opciones = {}) {
  const env = { ...process.env, ...opciones };
  const CFG = {
    slskd: String(env.SLSKD_URL || 'http://slskd:5030').replace(/\/+$/, ''),
    apiKey: env.SLSKD_API_KEY || '',
    usuario: env.SLSKD_USERNAME || '',
    contrasena: env.SLSKD_PASSWORD || '',
    clave: env.LIQUID_CLAVE || '',
    musica: path.resolve(env.MUSICA_DIR || '/musica'),
    datos: path.resolve(env.DATOS_DIR || '/datos'),
    publico: String(env.PUBLICO || '').replace(/\/+$/, ''),
    origenes: String(env.ORIGENES || 'https://lukoffmon.github.io').split(',').map((o) => o.trim()).filter(Boolean),
    esperaBusqueda: Number(env.ESPERA_BUSQUEDA_MS || 12000),
    pausa: Number(env.PAUSA_MS || 700)
  };
  if (!CFG.clave || CFG.clave.length < 16) throw new Error('Falta LIQUID_CLAVE (16 caracteres o más).');

  const AUDIO = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav' };
  // Lo que suena en todos los navegadores (iPhone incluido) primero
  const PREFERENCIA = { '.mp3': 6, '.m4a': 5, '.aac': 4, '.flac': 3, '.ogg': 1, '.opus': 1, '.wav': 0 };

  /* ---------- slskd ---------- */
  let sesion = null;
  // Algunos campos pueden venir en camelCase o en PascalCase según la versión: se aceptan los dos
  const campo = (obj, nombre) => (obj == null ? undefined : obj[nombre] ?? obj[nombre.charAt(0).toUpperCase() + nombre.slice(1)]);

  async function entrar() {
    if (!CFG.usuario || !CFG.contrasena) return null;
    const res = await fetch(`${CFG.slskd}/api/v0/session`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: CFG.usuario, password: CFG.contrasena })
    });
    if (!res.ok) throw new Error(`slskd no dejó entrar (HTTP ${res.status})`);
    const data = await res.json();
    sesion = campo(data, 'token') || null;
    return sesion;
  }

  // Con clave de API (X-API-Key) si la hay; si slskd la rechaza, con usuario y contraseña (sesión)
  async function slskd(ruta, { method = 'GET', body } = {}, reintento = true) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (sesion) headers.Authorization = `Bearer ${sesion}`;
    else if (CFG.apiKey) headers['X-API-Key'] = CFG.apiKey;
    const res = await fetch(`${CFG.slskd}/api/v0${ruta}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if ((res.status === 401 || res.status === 403) && reintento && CFG.usuario) {
      await entrar();
      return slskd(ruta, { method, body }, false);
    }
    return res;
  }
  async function slskdJson(ruta, opciones) {
    const res = await slskd(ruta, opciones);
    if (!res.ok) throw Object.assign(new Error(`slskd respondió ${res.status} en ${ruta}`), { status: res.status });
    const texto = await res.text();
    return texto ? JSON.parse(texto) : null;
  }

  /* ---------- Buscar ---------- */
  const busquedas = new Map();
  let turno = Promise.resolve();
  const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const normal = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const baseName = (ruta) => String(ruta).split(/[\\/]/).pop();
  const carpeta = (ruta) => { const p = String(ruta).split(/[\\/]/); return p.length > 1 ? p[p.length - 2] : ''; };

  // «01 - Artista - Título.mp3» → { artista, titulo }
  function adivinar(ruta) {
    const nombre = baseName(ruta).replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ')
      .replace(/^\s*(?:\d{1,3}|[a-d]\d{1,2})\s*[-.)]\s*/i, '').replace(/^\d{2}\s+/, '').trim();
    const partes = nombre.split(/\s+[-–—]\s+/);
    if (partes.length >= 2) return { artista: partes[0].trim(), titulo: partes.slice(1).join(' - ').trim() };
    const dir = carpeta(ruta).replace(/_/g, ' ');
    const deDir = dir.split(/\s+[-–—]\s+/);
    return { artista: deDir.length >= 2 ? deDir[0].replace(/^\d{4}\s*/, '').trim() : '', titulo: nombre };
  }

  const codificar = (datos) => Buffer.from(JSON.stringify(datos)).toString('base64url');
  const decodificar = (id) => { try { return JSON.parse(Buffer.from(String(id), 'base64url').toString()); } catch { return null; } };

  function puntuar(r, palabras) {
    const texto = normal(`${carpeta(r.archivo)} ${baseName(r.archivo)}`);
    const aciertos = palabras.filter((p) => texto.includes(p)).length;
    if (aciertos < palabras.length) return 0;
    let p = 50 + PREFERENCIA[r.ext] * 3;
    if (r.kbps >= 256 || r.ext === '.flac') p += 6;
    else if (r.kbps && r.kbps < 160) p -= 8;
    if (r.libre) p += 10;
    p -= Math.min(15, (r.cola || 0) / 2);
    p += Math.min(8, Math.log10(1 + (r.velocidad || 0) / 1000) * 3);
    if (/\b(remix|live|karaoke|instrumental|sped ?up|slowed|nightcore)\b/.test(texto) && !palabras.some((w) => /remix|live|karaoke|instrumental/.test(w))) p -= 10;
    return p;
  }

  async function buscar(q) {
    const clave = normal(q).trim();
    const guardada = busquedas.get(clave);
    if (guardada && Date.now() - guardada.at < 10 * 60000) return guardada.resultados;
    // slskd solo deja empezar una búsqueda a la vez: se ponen en fila
    const hecho = turno.then(async () => {
      const id = crypto.randomUUID();
      await slskdJson('/searches', { method: 'POST', body: { id, searchText: q, searchTimeout: 8, responseLimit: 120, fileLimit: 5000, filterResponses: true } });
      const hasta = Date.now() + CFG.esperaBusqueda;
      while (Date.now() < hasta) {
        await dormir(CFG.pausa);
        const estado = await slskdJson(`/searches/${id}`).catch(() => null);
        if (campo(estado, 'isComplete') || /Completed/.test(String(campo(estado, 'state') || ''))) break;
      }
      const respuestas = (await slskdJson(`/searches/${id}/responses`).catch(() => [])) || [];
      slskd(`/searches/${id}`, { method: 'DELETE' }).catch(() => {});
      return respuestas;
    });
    turno = hecho.catch(() => {});
    const respuestas = await hecho;
    const palabras = normal(q).split(/\s+/).filter((w) => w.length > 1);
    const vistos = new Map();
    respuestas.forEach((resp) => {
      const usuario = campo(resp, 'username');
      (campo(resp, 'files') || []).forEach((f) => {
        const archivo = campo(f, 'filename');
        const ext = path.extname(baseName(archivo)).toLowerCase();
        const tamano = Number(campo(f, 'size')) || 0;
        const segundos = Number(campo(f, 'length')) || 0;
        if (!(ext in PREFERENCIA) || tamano < 500000 || (segundos && (segundos < 45 || segundos > 1800))) return;
        const r = {
          archivo, usuario, ext, tamano, segundos,
          kbps: Number(campo(f, 'bitRate')) || 0,
          libre: Boolean(campo(resp, 'hasFreeUploadSlot')),
          cola: Number(campo(resp, 'queueLength')) || 0,
          velocidad: Number(campo(resp, 'uploadSpeed')) || 0
        };
        r.puntos = puntuar(r, palabras);
        if (!r.puntos) return;
        const { artista, titulo } = adivinar(archivo);
        // La misma canción de varias personas: se queda la mejor copia
        const huella = `${normal(artista)}|${normal(titulo)}`;
        const antes = vistos.get(huella);
        if (!antes || r.puntos > antes.puntos) vistos.set(huella, { ...r, artista, titulo });
      });
    });
    const resultados = [...vistos.values()].sort((a, b) => b.puntos - a.puntos).slice(0, 40).map((r) => ({
      id: codificar({ u: r.usuario, f: r.archivo, s: r.tamano }),
      titulo: r.titulo, artista: r.artista, album: carpeta(r.archivo), ext: r.ext.slice(1), kbps: r.kbps,
      segundos: r.segundos, tamano: r.tamano, usuario: r.usuario, libre: r.libre, cola: r.cola, velocidad: r.velocidad
    }));
    busquedas.set(clave, { at: Date.now(), resultados });
    if (busquedas.size > 200) busquedas.delete(busquedas.keys().next().value);
    return resultados;
  }

  /* ---------- Pedidos (descargas) ---------- */
  const PEDIDOS = path.join(CFG.datos, 'pedidos.json');
  let pedidos = {};
  try { pedidos = JSON.parse(fs.readFileSync(PEDIDOS, 'utf8')); } catch { pedidos = {}; }
  const guardarPedidos = () => fsp.mkdir(CFG.datos, { recursive: true }).then(() => fsp.writeFile(PEDIDOS, JSON.stringify(pedidos))).catch(() => {});

  async function pedir(id) {
    const d = decodificar(id);
    if (!d?.u || !d?.f || !(d.s > 0)) throw Object.assign(new Error('Pedido no válido'), { status: 400 });
    let res = await slskd(`/transfers/downloads/${encodeURIComponent(d.u)}`, { method: 'POST', body: [{ filename: d.f, size: d.s }] });
    // Versiones nuevas: por lotes
    if (res.status === 404 || res.status === 405) res = await slskd('/transfers/downloads/batches', { method: 'POST', body: { username: d.u, files: [{ filename: d.f, size: d.s }] } });
    if (!res.ok && res.status !== 207) throw Object.assign(new Error(res.status === 404 ? 'Esa persona ya no está conectada a Soulseek' : `slskd no aceptó la descarga (HTTP ${res.status})`), { status: 502 });
    pedidos[id] = { u: d.u, f: d.f, s: d.s, at: Date.now() };
    await guardarPedidos();
    return { id, estado: 'en-cola', porcentaje: 0 };
  }

  // Estados de slskd (banderas): «Queued», «InProgress», «Completed, Succeeded», «Completed, Errored»…
  function estadoDe(t) {
    const s = String(campo(t, 'state') ?? '');
    const n = Number(s);
    const tiene = (nombre, bit) => (Number.isFinite(n) && s !== '' ? Boolean(n & bit) : s.includes(nombre));
    if (tiene('Succeeded', 32)) return 'lista';
    if (tiene('Completed', 16)) return 'fallo';
    if (tiene('InProgress', 8) || tiene('Initializing', 4)) return 'bajando';
    return 'en-cola';
  }

  async function estadoPedidos(ids, base) {
    const porUsuario = new Map();
    const salida = [];
    for (const id of ids) {
      const p = pedidos[id];
      if (!p) { salida.push({ id, estado: 'desconocido' }); continue; }
      if (!porUsuario.has(p.u)) {
        porUsuario.set(p.u, await slskdJson(`/transfers/downloads/${encodeURIComponent(p.u)}`).catch(() => null));
      }
      const datos = porUsuario.get(p.u);
      const archivos = (campo(datos, 'directories') || []).flatMap((d) => campo(d, 'files') || []);
      const t = archivos.filter((x) => campo(x, 'filename') === p.f).pop();
      if (!t) { salida.push({ id, estado: 'en-cola', porcentaje: 0 }); continue; }
      const estado = estadoDe(t);
      const fila = { id, estado, porcentaje: Math.round(Number(campo(t, 'percentComplete')) || (estado === 'lista' ? 100 : 0)) };
      if (estado === 'lista') {
        const cancion = await buscarLocal(p, base);
        if (cancion) fila.cancion = cancion;
        else fila.estado = 'bajando';
      }
      if (estado === 'fallo') fila.motivo = String(campo(t, 'exception') || campo(t, 'state') || '');
      salida.push(fila);
    }
    return salida;
  }

  /* ---------- Biblioteca: lo descargado, con sus etiquetas y duración ---------- */
  const INDICE = path.join(CFG.datos, 'indice.json');
  let indice = {};
  try { indice = JSON.parse(fs.readFileSync(INDICE, 'utf8')); } catch { indice = {}; }
  let escaneo = null;
  let ultimoEscaneo = 0;

  async function recorrer(dir, salida = []) {
    let entradas;
    try { entradas = await fsp.readdir(dir, { withFileTypes: true }); } catch { return salida; }
    for (const e of entradas) {
      if (e.name.startsWith('.')) continue;
      const ruta = path.join(dir, e.name);
      if (e.isDirectory()) await recorrer(ruta, salida);
      else if (AUDIO[path.extname(e.name).toLowerCase()]) salida.push(ruta);
    }
    return salida;
  }

  async function escanear(forzar = false) {
    if (escaneo) return escaneo;
    if (!forzar && Date.now() - ultimoEscaneo < 5000) return indice;
    escaneo = (async () => {
      const archivos = await recorrer(CFG.musica);
      const nuevo = {};
      for (const ruta of archivos) {
        const rel = path.relative(CFG.musica, ruta).split(path.sep).join('/');
        let st;
        try { st = await fsp.stat(ruta); } catch { continue; }
        const antes = indice[rel];
        if (antes && antes.m === st.mtimeMs && antes.b === st.size) { nuevo[rel] = antes; continue; }
        const meta = await leerEtiquetas(ruta, st.size).catch(() => ({}));
        const adiv = adivinar(rel);
        nuevo[rel] = { m: st.mtimeMs, b: st.size, t: meta.titulo || adiv.titulo, a: meta.artista || adiv.artista, al: meta.album || '', s: Math.round(meta.segundos || 0) };
      }
      indice = nuevo;
      ultimoEscaneo = Date.now();
      await fsp.mkdir(CFG.datos, { recursive: true }).catch(() => {});
      await fsp.writeFile(INDICE, JSON.stringify(indice)).catch(() => {});
      return indice;
    })().finally(() => { escaneo = null; });
    return escaneo;
  }

  const idDe = (rel) => crypto.createHash('sha1').update(rel).digest('hex').slice(0, 16);
  const duracion = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');
  // La dirección pública de los enlaces al audio: PUBLICO si está, o la que usó Liquid para llegar
  // (con Tailscale Funnel no se conoce hasta iniciar sesión)
  function baseDe(req) {
    if (CFG.publico) return CFG.publico;
    const host = String(req?.headers['x-forwarded-host'] || req?.headers.host || '').split(',')[0].trim();
    const proto = String(req?.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    return host ? `${proto}://${host}` : '';
  }
  const urlDe = (rel, base) => `${base}/musica/${rel.split('/').map(encodeURIComponent).join('/')}?k=${encodeURIComponent(CFG.clave)}`;
  function fila(rel, d, base) {
    return { id: idDe(rel), title: d.t || 'Sin título', artist: d.a || '', album: '', duration: duracion(d.s), src: urlDe(rel, base), size: d.b };
  }
  async function lista(base) {
    const idx = await escanear();
    return Object.entries(idx).sort((a, b) => b[1].m - a[1].m).map(([rel, d]) => fila(rel, d, base));
  }
  async function buscarLocal(p, base) {
    const nombre = baseName(p.f);
    const encontrar = (idx) => Object.entries(idx).find(([rel, d]) => baseName(rel) === nombre && d.b === p.s)
      || Object.entries(idx).find(([rel]) => baseName(rel) === nombre);
    let hit = encontrar(indice);
    if (!hit) hit = encontrar(await escanear(true));
    return hit ? fila(hit[0], hit[1], base) : null;
  }

  /* ---------- HTTP ---------- */
  function cabecerasCors(req) {
    const origen = req.headers.origin;
    const permitido = origen && (CFG.origenes.includes('*') || CFG.origenes.includes(origen)) ? origen : CFG.origenes[0];
    return {
      'Access-Control-Allow-Origin': CFG.origenes.includes('*') ? '*' : permitido,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin'
    };
  }
  function autorizado(req, url) {
    const dada = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || url.searchParams.get('k') || '';
    const a = Buffer.from(dada);
    const b = Buffer.from(CFG.clave);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  function json(res, cors, codigo, datos) {
    res.writeHead(codigo, { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(datos));
  }
  async function leerCuerpo(req) {
    let datos = '';
    for await (const trozo of req) { datos += trozo; if (datos.length > 100000) throw Object.assign(new Error('Demasiado grande'), { status: 413 }); }
    return datos ? JSON.parse(datos) : {};
  }

  async function servirAudio(req, res, cors, rel) {
    const ruta = path.resolve(CFG.musica, rel);
    if (!ruta.startsWith(CFG.musica + path.sep)) return json(res, cors, 403, { error: 'Ruta no permitida' });
    let st;
    try { st = await fsp.stat(ruta); } catch { return json(res, cors, 404, { error: 'No existe' }); }
    const tipo = AUDIO[path.extname(ruta).toLowerCase()] || 'application/octet-stream';
    const rango = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    let inicio = 0;
    let fin = st.size - 1;
    if (rango) {
      if (rango[1]) { inicio = Number(rango[1]); if (rango[2]) fin = Math.min(Number(rango[2]), st.size - 1); }
      else if (rango[2]) inicio = Math.max(0, st.size - Number(rango[2]));
      if (inicio >= st.size || inicio > fin) {
        res.writeHead(416, { ...cors, 'Content-Range': `bytes */${st.size}` });
        return res.end();
      }
    }
    res.writeHead(rango ? 206 : 200, {
      ...cors, 'Content-Type': tipo, 'Accept-Ranges': 'bytes', 'Content-Length': String(fin - inicio + 1),
      'Cache-Control': 'private, max-age=86400', ...(rango ? { 'Content-Range': `bytes ${inicio}-${fin}/${st.size}` } : {})
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(ruta, { start: inicio, end: fin }).pipe(res);
  }

  const servidor = http.createServer(async (req, res) => {
    const cors = cabecerasCors(req);
    try {
      const url = new URL(req.url, 'http://puente');
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
      if (url.pathname === '/salud') return json(res, cors, 200, { ok: true, nombre: 'Liquid SKd' });
      if (!autorizado(req, url)) return json(res, cors, 401, { error: 'Clave incorrecta' });
      if (url.pathname.startsWith('/musica/') && ['GET', 'HEAD'].includes(req.method)) {
        return servirAudio(req, res, cors, decodeURIComponent(url.pathname.slice('/musica/'.length)));
      }
      if (url.pathname === '/api/estado') {
        const conectado = await slskdJson('/application').then((d) => {
          const server = campo(d, 'server');
          const st = String(campo(server, 'state') ?? '');
          return campo(server, 'isConnected') ?? (st ? /Connected/.test(st) && !/Disconnected/.test(st) : true);
        }).catch(() => false);
        const idx = await escanear();
        return json(res, cors, 200, { ok: true, soulseek: Boolean(conectado), canciones: Object.keys(idx).length });
      }
      if (url.pathname === '/api/buscar') {
        const q = String(url.searchParams.get('q') || '').trim().slice(0, 120);
        if (q.length < 2) return json(res, cors, 400, { error: 'Escribe al menos 2 letras' });
        return json(res, cors, 200, { resultados: await buscar(q) });
      }
      if (url.pathname === '/api/pedir' && req.method === 'POST') {
        const { id } = await leerCuerpo(req);
        return json(res, cors, 200, await pedir(id));
      }
      if (url.pathname === '/api/pedidos') {
        const ids = String(url.searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 50);
        return json(res, cors, 200, { pedidos: await estadoPedidos(ids, baseDe(req)) });
      }
      if (url.pathname === '/api/lista.json') return json(res, cors, 200, await lista(baseDe(req)));
      return json(res, cors, 404, { error: 'No existe' });
    } catch (error) {
      if (!res.headersSent) json(res, cors, error.status || 500, { error: error.message || 'Error' });
      else res.destroy();
    }
  });
  return { servidor, escanear, buscar, CFG };
}

/* ---------- Etiquetas y duración (MP3 con ID3 y FLAC), leyendo solo el principio ---------- */
async function leerEtiquetas(ruta, tamano) {
  const fh = await fsp.open(ruta, 'r');
  try {
    const cabeza = Buffer.alloc(10);
    await fh.read(cabeza, 0, 10, 0);
    if (cabeza.toString('latin1', 0, 4) === 'fLaC') {
      const buf = Buffer.alloc(Math.min(tamano, 1 << 20));
      await fh.read(buf, 0, buf.length, 0);
      return leerFlac(buf);
    }
    let tagLen = 0;
    if (cabeza.toString('latin1', 0, 3) === 'ID3') tagLen = 10 + ((cabeza[6] & 127) << 21 | (cabeza[7] & 127) << 14 | (cabeza[8] & 127) << 7 | (cabeza[9] & 127));
    const buf = Buffer.alloc(Math.min(tamano, Math.min(tagLen, 4 << 20) + 65536));
    await fh.read(buf, 0, buf.length, 0);
    const meta = tagLen ? leerId3(buf, cabeza[3]) : {};
    meta.segundos = duracionMp3(buf, tagLen, tamano);
    return meta;
  } finally {
    await fh.close();
  }
}

function texto(buf) {
  const enc = buf[0];
  const datos = buf.subarray(1);
  let t;
  if (enc === 1 || enc === 2) {
    let d = datos;
    let be = enc === 2;
    if (d[0] === 0xfe && d[1] === 0xff) { be = true; d = d.subarray(2); } else if (d[0] === 0xff && d[1] === 0xfe) { be = false; d = d.subarray(2); }
    if (be) { const sw = Buffer.from(d); for (let i = 0; i + 1 < sw.length; i += 2) { const x = sw[i]; sw[i] = sw[i + 1]; sw[i + 1] = x; } d = sw; }
    t = d.toString('utf16le');
  } else t = enc === 3 ? datos.toString('utf8') : datos.toString('latin1');
  return t.replace(/\0[\s\S]*$/, '').trim();
}

function leerId3(buf, version) {
  const meta = {};
  const fin = 10 + ((buf[6] & 127) << 21 | (buf[7] & 127) << 14 | (buf[8] & 127) << 7 | (buf[9] & 127));
  let pos = 10;
  if (buf[5] & 0x40) pos += version === 4 ? ((buf[10] & 127) << 21 | (buf[11] & 127) << 14 | (buf[12] & 127) << 7 | (buf[13] & 127)) : 4 + buf.readUInt32BE(10);
  while (pos + 10 <= Math.min(fin, buf.length)) {
    const id = buf.toString('latin1', pos, pos + 4);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const tam = version === 4 ? ((buf[pos + 4] & 127) << 21 | (buf[pos + 5] & 127) << 14 | (buf[pos + 6] & 127) << 7 | (buf[pos + 7] & 127)) : buf.readUInt32BE(pos + 4);
    const cuerpo = buf.subarray(pos + 10, pos + 10 + tam);
    if (id === 'TIT2') meta.titulo = texto(cuerpo);
    if (id === 'TPE1') meta.artista = texto(cuerpo);
    if (id === 'TALB') meta.album = texto(cuerpo);
    pos += 10 + tam;
  }
  return meta;
}

const KBPS = { 1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] };
const HZ = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 25: [11025, 12000, 8000] };
function duracionMp3(buf, inicio, tamano) {
  for (let pos = inicio; pos + 4 <= buf.length; pos++) {
    if (buf[pos] !== 0xff || (buf[pos + 1] & 0xe0) !== 0xe0) continue;
    const b1 = buf[pos + 1];
    const b2 = buf[pos + 2];
    const ver = { 3: 1, 2: 2, 0: 25 }[(b1 >> 3) & 3];
    const capa = (b1 >> 1) & 3;
    const bi = b2 >> 4;
    const ri = (b2 >> 2) & 3;
    if (!ver || capa !== 1 || !(bi > 0 && bi < 15) || ri > 2) continue;
    const kbps = KBPS[ver === 1 ? 1 : 2][bi];
    const hz = HZ[ver][ri];
    const muestras = ver === 1 ? 1152 : 576;
    const mono = (buf[pos + 3] >> 6) === 3;
    const x = pos + 4 + (ver === 1 ? (mono ? 17 : 32) : (mono ? 9 : 17));
    const tag = buf.toString('latin1', x, x + 4);
    if ((tag === 'Xing' || tag === 'Info') && buf[x + 7] & 1) return (buf.readUInt32BE(x + 8) * muestras) / hz;
    if (buf.toString('latin1', pos + 36, pos + 40) === 'VBRI') return (buf.readUInt32BE(pos + 50) * muestras) / hz;
    return ((tamano - pos) * 8) / (kbps * 1000);
  }
  return 0;
}

function leerFlac(buf) {
  const meta = {};
  let pos = 4;
  for (;;) {
    if (pos + 4 > buf.length) break;
    const ultimo = buf[pos] & 0x80;
    const tipo = buf[pos] & 0x7f;
    const tam = buf.readUIntBE(pos + 1, 3);
    const b = buf.subarray(pos + 4, pos + 4 + tam);
    if (tipo === 0 && b.length >= 18) {
      const hz = (b[10] << 12) | (b[11] << 4) | (b[12] >> 4);
      const total = (b[13] & 0x0f) * 2 ** 32 + b.readUInt32BE(14);
      if (hz) meta.segundos = total / hz;
    } else if (tipo === 4 && b.length > 8) {
      let p = 4 + b.readUInt32LE(0);
      const n = b.readUInt32LE(p);
      p += 4;
      for (let i = 0; i < n && p + 4 <= b.length; i++) {
        const l = b.readUInt32LE(p);
        const [k, ...v] = b.toString('utf8', p + 4, p + 4 + l).split('=');
        const valor = v.join('=');
        if (/^title$/i.test(k)) meta.titulo = valor;
        if (/^artist$/i.test(k)) meta.artista ||= valor;
        if (/^album$/i.test(k)) meta.album = valor;
        p += 4 + l;
      }
    }
    pos += 4 + tam;
    if (ultimo) break;
  }
  return meta;
}

// Arranque normal (node server.mjs)
if (import.meta.url === `file://${process.argv[1]}`) {
  const { servidor, escanear, CFG } = crearPuente();
  const puerto = Number(process.env.PUERTO || 8787);
  servidor.listen(puerto, () => {
    console.log(`[Liquid SKd] Puente en el puerto ${puerto}. Música en ${CFG.musica}. Público: ${CFG.publico || '(sin PUBLICO)'}`);
    escanear(true).then((idx) => console.log(`[Liquid SKd] ${Object.keys(idx).length} canciones en la biblioteca.`));
  });
}
