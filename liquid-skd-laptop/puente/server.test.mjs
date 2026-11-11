// Tests del puente con un slskd de mentira (no hace falta Soulseek ni Docker)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crearPuente } from './server.mjs';

const CLAVE = 'clave-de-prueba-1234567890';
const frame = Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x64]), Buffer.alloc(413)]);
const mp3 = (n) => Buffer.concat(Array.from({ length: n }, () => frame));
// Etiqueta ID3v2.3 con título y artista
function id3(titulo, artista) {
  const fr = (id, t) => { const body = Buffer.concat([Buffer.from([3]), Buffer.from(t, 'utf8')]); const h = Buffer.alloc(10); h.write(id, 0, 'latin1'); h.writeUInt32BE(body.length, 4); return Buffer.concat([h, body]); };
  const frames = Buffer.concat([fr('TIT2', titulo), fr('TPE1', artista)]);
  const h = Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0]);
  const n = frames.length;
  h[6] = (n >> 21) & 127; h[7] = (n >> 14) & 127; h[8] = (n >> 7) & 127; h[9] = n & 127;
  return Buffer.concat([h, frames]);
}

async function montar(extra = {}) {
  const musica = fs.mkdtempSync(path.join(os.tmpdir(), 'skd-musica-'));
  const datos = fs.mkdtempSync(path.join(os.tmpdir(), 'skd-datos-'));
  fs.mkdirSync(path.join(musica, 'Discos'));
  fs.writeFileSync(path.join(musica, 'Discos', '01 - Banda - Ya Estaba.mp3'), Buffer.concat([id3('Ya Estaba', 'Banda Local'), mp3(200)]));
  const estado = { descargas: [], pedidas: [] };
  const fake = http.createServer((req, res) => {
    const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
    if (req.headers['x-api-key'] !== 'api-key-falsa') return send(401);
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      if (req.url === '/api/v0/searches' && req.method === 'POST') return send(200, { id: JSON.parse(body).id, state: 'InProgress' });
      if (/^\/api\/v0\/searches\/[^/]+$/.test(req.url) && req.method === 'GET') return send(200, { isComplete: true, state: 'Completed, TimedOut' });
      if (/\/responses$/.test(req.url)) return send(200, [
        { username: 'ana', hasFreeUploadSlot: true, queueLength: 0, uploadSpeed: 900000, files: [
          { filename: '@@ana\\Musica\\Neón Sur - Noche\\01 - Neón Sur - Medianoche.mp3', size: 8000000, bitRate: 320, length: 210 },
          { filename: '@@ana\\Musica\\Neón Sur - Noche\\cover.jpg', size: 900000 },
          { filename: '@@ana\\Musica\\Otra\\Nada que ver.mp3', size: 7000000, bitRate: 320, length: 200 }] },
        { username: 'beto', hasFreeUploadSlot: false, queueLength: 40, uploadSpeed: 10000, files: [
          { filename: 'C:\\mp3\\Neón Sur - Medianoche.mp3', size: 4000000, bitRate: 128, length: 211 }] }
      ]);
      if (req.method === 'DELETE') return send(204);
      if (req.url === '/api/v0/transfers/downloads/ana' && req.method === 'POST') { estado.pedidas.push(JSON.parse(body)); return send(201, {}); }
      if (req.url === '/api/v0/transfers/downloads/ana' && req.method === 'GET') return send(200, { username: 'ana', directories: [{ directory: 'x', files: estado.descargas }] });
      if (req.url === '/api/v0/application') return send(200, { server: { state: 'Connected, LoggedIn' } });
      return send(404, {});
    });
  });
  await new Promise((ok) => fake.listen(0, ok));
  const { servidor } = crearPuente({ SLSKD_URL: `http://127.0.0.1:${fake.address().port}`, SLSKD_API_KEY: 'api-key-falsa', LIQUID_CLAVE: CLAVE,
    MUSICA_DIR: musica, DATOS_DIR: datos, PUBLICO: 'https://skd.example', PAUSA_MS: 10, ESPERA_BUSQUEDA_MS: 500, ...extra });
  await new Promise((ok) => servidor.listen(0, ok));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const api = (ruta, init = {}) => fetch(`${base}${ruta}`, { ...init, headers: { Authorization: `Bearer ${CLAVE}`, Origin: 'https://lukoffmon.github.io', ...(init.headers || {}) } });
  return { base, api, musica, estado, cerrar: () => { servidor.close(); fake.close(); } };
}

test('sin clave no se entra; /salud sí', async () => {
  const m = await montar();
  try {
    assert.equal((await fetch(`${m.base}/salud`)).status, 200);
    assert.equal((await fetch(`${m.base}/api/lista.json`)).status, 401);
    assert.equal((await fetch(`${m.base}/api/lista.json?k=mala`)).status, 401);
    const ok = await m.api('/api/estado');
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('access-control-allow-origin'), 'https://lukoffmon.github.io');
    assert.deepEqual(await ok.json(), { ok: true, soulseek: true, canciones: 1 });
  } finally { m.cerrar(); }
});

test('la biblioteca lee etiquetas y duración, y el audio se sirve por rangos', async () => {
  const m = await montar();
  try {
    const lista = await (await m.api('/api/lista.json')).json();
    assert.equal(lista.length, 1);
    assert.equal(lista[0].title, 'Ya Estaba');
    assert.equal(lista[0].artist, 'Banda Local');
    assert.equal(lista[0].duration, '0:05');
    assert.match(lista[0].src, /^https:\/\/skd\.example\/musica\/Discos\/01%20-%20Banda%20-%20Ya%20Estaba\.mp3\?k=/);
    const ruta = new URL(lista[0].src).pathname + new URL(lista[0].src).search;
    const parte = await fetch(`${m.base}${ruta}`, { headers: { Range: 'bytes=0-99' } });
    assert.equal(parte.status, 206);
    assert.equal(parte.headers.get('content-type'), 'audio/mpeg');
    assert.equal((await parte.arrayBuffer()).byteLength, 100);
    assert.equal((await fetch(`${m.base}/musica/..%2F..%2Fetc%2Fpasswd?k=${CLAVE}`)).status, 403);
  } finally { m.cerrar(); }
});

test('buscar elige la mejor copia y descarta lo que no es audio o no encaja', async () => {
  const m = await montar();
  try {
    const { resultados } = await (await m.api('/api/buscar?q=neon%20sur%20medianoche')).json();
    assert.equal(resultados.length, 1);
    assert.equal(resultados[0].titulo, 'Medianoche');
    assert.equal(resultados[0].artista, 'Neón Sur');
    assert.equal(resultados[0].usuario, 'ana');
    assert.equal(resultados[0].kbps, 320);
  } finally { m.cerrar(); }
});

test('pedir, seguir el progreso y recibir la canción ya en la biblioteca', async () => {
  const m = await montar();
  try {
    const { resultados } = await (await m.api('/api/buscar?q=neon%20sur%20medianoche')).json();
    const id = resultados[0].id;
    const pedido = await (await m.api('/api/pedir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })).json();
    assert.equal(pedido.estado, 'en-cola');
    assert.equal(m.estado.pedidas[0][0].size, 8000000);
    const remoto = '@@ana\\Musica\\Neón Sur - Noche\\01 - Neón Sur - Medianoche.mp3';
    m.estado.descargas = [{ filename: remoto, state: 'InProgress', percentComplete: 42.4 }];
    let { pedidos } = await (await m.api(`/api/pedidos?ids=${id}`)).json();
    assert.deepEqual(pedidos[0], { id, estado: 'bajando', porcentaje: 42 });
    // Termina: slskd deja el archivo en la carpeta de descargas
    fs.mkdirSync(path.join(m.musica, 'Neón Sur - Noche'));
    fs.writeFileSync(path.join(m.musica, 'Neón Sur - Noche', '01 - Neón Sur - Medianoche.mp3'), mp3(300));
    m.estado.descargas = [{ filename: remoto, state: 'Completed, Succeeded', percentComplete: 100 }];
    ({ pedidos } = await (await m.api(`/api/pedidos?ids=${id}`)).json());
    assert.equal(pedidos[0].estado, 'lista');
    assert.equal(pedidos[0].cancion.title, 'Medianoche');
    assert.equal(pedidos[0].cancion.artist, 'Neón Sur');
    const lista = await (await m.api('/api/lista.json')).json();
    assert.equal(lista.length, 2);
    // Un fallo se cuenta como fallo
    m.estado.descargas = [{ filename: remoto, state: 'Completed, Errored' }];
    ({ pedidos } = await (await m.api(`/api/pedidos?ids=${id}`)).json());
    assert.equal(pedidos[0].estado, 'fallo');
  } finally { m.cerrar(); }
});

test('sin PUBLICO, los enlaces usan la dirección por la que llegó Liquid (Tailscale Funnel)', async () => {
  const m = await montar({ PUBLICO: '' });
  try {
    const lista = await (await m.api('/api/lista.json', { headers: { 'X-Forwarded-Host': 'liquid-skd.colita.ts.net', 'X-Forwarded-Proto': 'https' } })).json();
    assert.match(lista[0].src, /^https:\/\/liquid-skd\.colita\.ts\.net\/musica\//);
  } finally { m.cerrar(); }
});
