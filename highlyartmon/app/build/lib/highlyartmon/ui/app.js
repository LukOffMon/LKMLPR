/* HighlyArtMon editor. Runs against the local app (live with Claude) or standalone in the browser. */
"use strict";
(() => {
const $ = (s) => document.querySelector(s);
const TOKEN = (document.querySelector('meta[name="ham-token"]') || {}).content || "";
const LOCAL = !!TOKEN && !TOKEN.startsWith("__") && location.protocol.startsWith("http") && /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
const CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
const nid = () => Math.random().toString(16).slice(2, 10).padEnd(8, "0");

let PRESETS = {};
let doc = null;            // {..., cels: {key: Uint8Array}}
let pal = [];              // [[r,g,b] | null]
const st = { layer: 0, frame: 0, tool: "pencil", prim: 1, sec: 0, zoom: 8, ox: 0, oy: 0, brush: 1,
  grid: true, onion: false, sil: false, tile: false, iso: false, pp: true, symX: false, symY: false,
  playing: false, sel: null, follow: true, dirty: true, hover: null, preview: null, marks: [], markFrom: null };
const undo = [], redo = [];
let saveTimer = null, saving = false, pendingSave = false, dragging = false;

// ---------------- doc helpers
function decodeDoc(d) {
  const n = d.width * d.height, cels = {};
  for (const [k, v] of Object.entries(d.cels || {})) {
    const a = new Uint8Array(n);
    for (let i = 0; i < n; i++) a[i] = parseInt(v.substr(i * 2, 2), 16) || 0;
    cels[k] = a;
  }
  return { ...d, cels };
}
function encodeDoc(d) {
  const out = { ...d, cels: {} };
  for (const [k, a] of Object.entries(d.cels)) {
    if (!a.some((v) => v)) continue;
    let s = ""; for (let i = 0; i < a.length; i++) s += HEX[a[i]];
    out.cels[k] = s;
  }
  return out;
}
const key = (li, fi) => `${doc.layers[li].id}:${doc.frames[fi].id}`;
function cel(li = st.layer, fi = st.frame, create = true) {
  const k = key(li, fi);
  let c = doc.cels[k];
  if (!c) { c = new Uint8Array(doc.width * doc.height); if (create) doc.cels[k] = c; }
  return c;
}
function newDoc(name, w, h, palette, frames = 1, mode = "2d", bg = "#2b2f3a") {
  return { app: "highlyartmon", format: 1, name, width: w, height: h, palette: [null, ...palette],
    layers: [{ id: nid(), name: "base", visible: true, opacity: 1 }],
    frames: Array.from({ length: Math.max(1, frames) }, () => ({ id: nid(), duration: 100 })),
    tags: [], origin: [Math.floor(w / 2), h - 1], meta: { mode, bg, notes: "" }, version: 0, updated: Date.now() / 1000, cels: {} };
}
function setPal() { pal = doc.palette.map((c) => c ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : null); }
function snapshot() { return JSON.stringify(encodeDoc(doc)); }
function pushUndo() { undo.push(snapshot()); if (undo.length > 120) undo.shift(); redo.length = 0; }
function restore(s) { const v = doc.version; doc = decodeDoc(JSON.parse(s)); doc.version = v; clampSel(); setPal(); changed(); }
function clampSel() { st.layer = Math.min(st.layer, doc.layers.length - 1); st.frame = Math.min(st.frame, doc.frames.length - 1); }

// ---------------- storage backends
async function api(method, path, body) {
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json", "X-HAM-Token": TOKEN }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || `HTTP ${r.status}`); e.status = r.status; e.body = j; throw e; }
  return j;
}
const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }, del(k) { try { localStorage.removeItem(k); } catch {} } };
const store = LOCAL ? {
  list: async () => (await api("GET", "/api/projects")).projects,
  load: (n) => api("GET", "/api/doc/" + encodeURIComponent(n)),
  save: (d, base) => api("PUT", "/api/doc/" + encodeURIComponent(d.name), { doc: d, base_version: base }),
  remove: (n) => api("DELETE", "/api/doc/" + encodeURIComponent(n)),
  act: (a, b) => api("POST", "/api/act/" + a, b),
} : {
  list: async () => JSON.parse(ls.get("ham:index") || "[]"),
  load: async (n) => { const s = ls.get("ham:doc:" + n); if (!s) throw new Error("no existe"); return JSON.parse(s); },
  save: async (d) => {
    d.version = (d.version || 0) + 1;
    if (!ls.set("ham:doc:" + d.name, JSON.stringify(d))) throw new Error("el navegador no permite guardar (modo privado o sin espacio)");
    const idx = JSON.parse(ls.get("ham:index") || "[]").filter((x) => x.name !== d.name);
    idx.unshift({ name: d.name, size: [d.width, d.height], frames: d.frames.length, updated: Date.now() / 1000 });
    ls.set("ham:index", JSON.stringify(idx));
    return { version: d.version };
  },
  remove: async (n) => { ls.del("ham:doc:" + n); ls.set("ham:index", JSON.stringify(JSON.parse(ls.get("ham:index") || "[]").filter((x) => x.name !== n))); },
  act: async () => { throw new Error("Esta función necesita la app local HighlyArtMon"); },
};

function scheduleSave() {
  $("#sSave").textContent = "● cambios sin guardar";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 280);
}
async function doSave() {
  if (!doc) return;
  if (saving) { pendingSave = true; return; }
  saving = true;
  try {
    const r = await store.save(encodeDoc(doc), doc.version);
    doc.version = r.version;
    $("#sSave").textContent = `✓ guardado v${doc.version}` + (LOCAL ? "" : " (navegador)");
    refreshList();
  } catch (e) {
    if (e.status === 409 && e.body && e.body.doc) { loadInto(e.body.doc); toast("Claude cambió el sprite a la vez; cargué su versión (Ctrl+Z recupera la tuya)"); }
    else { $("#sSave").textContent = "✗ " + e.message; }
  } finally {
    saving = false;
    if (pendingSave) { pendingSave = false; doSave(); }
  }
}

// ---------------- live (SSE)
function connectLive() {
  const pill = $("#conn");
  if (!LOCAL) { pill.className = "pill browser"; pill.querySelector("span").textContent = "Modo navegador"; pill.title = "Instala la app local para conectar con Claude"; return; }
  const es = new EventSource("/api/events?token=" + encodeURIComponent(TOKEN));
  es.onopen = () => { pill.className = "pill live"; pill.querySelector("span").textContent = "En vivo con Claude"; };
  es.onerror = () => {
    pill.className = "pill"; pill.querySelector("span").textContent = "Reconectando…";
    // the app was restarted: this page holds an old token, so reload to get the new one
    fetch("/api/projects", { headers: { "X-HAM-Token": TOKEN } }).then((r) => { if (r.status === 401) location.reload(); }).catch(() => {});
  };
  es.onmessage = async (m) => {
    const ev = JSON.parse(m.data);
    if (ev.type === "activity") feed(ev);
    if (ev.type === "doc") {
      if (doc && ev.name === doc.name && ev.version > doc.version && ev.by !== "you") {
        if (dragging) { pendingRemote = true; return; }
        await reloadCurrent(true);
      } else if (st.follow && ev.by === "claude" && (!doc || ev.name !== doc.name)) {
        await open(ev.name);
      }
      refreshList();
    }
    if (ev.type === "focus" && st.follow) { await open(ev.name); if (ev.frame != null) { st.frame = Math.min(ev.frame, doc.frames.length - 1); changed(false); } }
    if (ev.type === "deleted") refreshList();
  };
  setInterval(async () => { try { const s = await store.act("status", {}); $("#viewers").textContent = s.viewers + " ventana(s)"; } catch {} }, 10000);
}
let pendingRemote = false;
async function reloadCurrent(flash) {
  const d = await store.load(doc.name);
  pushUndo();
  loadInto(d, true);
  if (flash) pulse();
}
function loadInto(d, keepView) {
  doc = decodeDoc(d); setPal(); clampSel();
  if (!keepView) fit();
  changed(false);
}
function feed(ev) {
  const box = $("#feed");
  if (box.querySelector(".hint")) box.innerHTML = "";
  const el = document.createElement("div");
  el.className = "fd" + (ev.by === "you" ? " you" : "");
  const t = new Date((ev.t || Date.now() / 1000) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  el.innerHTML = `<b>${ev.by === "claude" ? "Claude" : "Tú"}</b><time>${t}</time>${ev.name ? ` · <code>${esc(ev.name)}</code>` : ""}<div></div>`;
  el.querySelector("div").textContent = ev.text;
  box.prepend(el);
  while (box.children.length > 60) box.lastChild.remove();
  if (ev.by === "claude") { const ct = $("#claudeToast"); ct.innerHTML = "<b>✦ Claude</b> "; ct.append(document.createTextNode(ev.text)); ct.classList.add("show"); clearTimeout(ct._t); ct._t = setTimeout(() => ct.classList.remove("show"), 4500); }
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let pulseUntil = 0;
function pulse() { pulseUntil = performance.now() + 700; st.dirty = true; }
let uiTimer = null;
function sendUiState() {
  if (!LOCAL || !doc) return;
  clearTimeout(uiTimer);
  uiTimer = setTimeout(() => api("POST", "/api/ui-state", { doc: doc.name, frame: st.frame, layer: st.layer, tool: st.tool, color: st.prim }).catch(() => {}), 400);
}

// ---------------- list / open
async function refreshList() {
  let list = [];
  try { list = await store.list(); } catch {}
  const sel = $("#docSel");
  const cur = doc ? doc.name : "";
  sel.innerHTML = list.map((p) => `<option value="${esc(p.name)}">${esc(p.name)} · ${p.size[0]}×${p.size[1]}${p.frames > 1 ? " · " + p.frames + "f" : ""}</option>`).join("");
  if (cur && !list.some((p) => p.name === cur)) sel.insertAdjacentHTML("afterbegin", `<option value="${esc(cur)}">${esc(cur)}</option>`);
  sel.value = cur;
  $("#empty").hidden = !!(doc || list.length);
  return list;
}
async function open(name) {
  if (doc && doc.name === name) return;
  try {
    if (doc && saveTimer) { clearTimeout(saveTimer); await doSave(); }
    const d = await store.load(name);
    undo.length = 0; redo.length = 0;
    st.layer = 0; st.frame = 0; st.sel = null;
    loadInto(d);
    $("#docSel").value = name;
    $("#empty").hidden = true;
    try { ls.set("ham:last", name); } catch {}
  } catch (e) { toast("No pude abrir " + name + ": " + e.message); }
}

// ---------------- rendering
const cv = $("#cv"), ctx = cv.getContext("2d");
const stage = $("#stage");
function resize() {
  const r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  cv.style.width = r.width + "px"; cv.style.height = r.height + "px";
  st.dirty = true;
}
function fit() {
  if (!doc) return;
  const r = stage.getBoundingClientRect();
  st.zoom = Math.max(1, Math.floor(Math.min((r.width - 60) / doc.width, (r.height - 90) / doc.height)));
  st.ox = Math.round((r.width - doc.width * st.zoom) / 2);
  st.oy = Math.round((r.height - doc.height * st.zoom) / 2 + 14);
  st.dirty = true;
}
function layerImage(li, fi, tint, alpha = 1, silhouette = false) {
  const w = doc.width, h = doc.height, c = cel(li, fi, false), img = new ImageData(w, h), p = img.data;
  const a = Math.round(255 * (doc.layers[li].opacity ?? 1) * alpha);
  for (let i = 0; i < c.length; i++) {
    const v = c[i]; if (!v || !pal[v]) continue;
    let [r, g, b] = pal[v];
    if (silhouette) { r = 18; g = 18; b = 26; }
    if (tint) { r = r * 0.35 + tint[0] * 0.65; g = g * 0.35 + tint[1] * 0.65; b = b * 0.35 + tint[2] * 0.65; }
    p[i * 4] = r; p[i * 4 + 1] = g; p[i * 4 + 2] = b; p[i * 4 + 3] = a;
  }
  return img;
}
const tmp = document.createElement("canvas"), tctx = tmp.getContext("2d");
function frameCanvas(fi, opts = {}) {
  const c = document.createElement("canvas"); c.width = doc.width; c.height = doc.height;
  const x = c.getContext("2d");
  tmp.width = doc.width; tmp.height = doc.height;
  doc.layers.forEach((L, li) => {
    if (!L.visible) return;
    tctx.putImageData(layerImage(li, fi, opts.tint, opts.alpha ?? 1, opts.sil), 0, 0);
    x.drawImage(tmp, 0, 0);
  });
  if (opts.preview && fi === st.frame && st.preview) {
    for (const [px, py, v] of st.preview) { if (v && pal[v]) { x.fillStyle = doc.palette[v]; x.fillRect(px, py, 1, 1); } else x.clearRect(px, py, 1, 1); }
  }
  return c;
}
let checker = null;
function checkerPattern() {
  if (checker) return checker;
  const c = document.createElement("canvas"); c.width = c.height = 16;
  const x = c.getContext("2d"); x.fillStyle = "#3a3e4c"; x.fillRect(0, 0, 16, 16); x.fillStyle = "#2c2f3b"; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8);
  return (checker = ctx.createPattern(c, "repeat"));
}
function draw() {
  requestAnimationFrame(draw);
  if (!st.dirty && performance.now() > pulseUntil) return;
  st.dirty = false;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#0b0c11"; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!doc) return;
  const z = st.zoom, W = doc.width * z, H = doc.height * z, ox = st.ox, oy = st.oy;
  const main = frameCanvas(st.frame, { preview: true, sil: st.sil });
  if (st.tile) {
    ctx.globalAlpha = 0.55;
    for (let ty = -1; ty <= 1; ty++) for (let tx = -1; tx <= 1; tx++) if (tx || ty) { ctx.fillStyle = doc.meta.bg; ctx.fillRect(ox + tx * W, oy + ty * H, W, H); ctx.drawImage(main, ox + tx * W, oy + ty * H, W, H); }
    ctx.globalAlpha = 1;
  }
  ctx.save(); ctx.translate(ox, oy); ctx.fillStyle = checkerPattern(); ctx.fillRect(0, 0, W, H); ctx.restore();
  if (st.onion && doc.frames.length > 1) {
    const n = doc.frames.length;
    ctx.drawImage(frameCanvas((st.frame - 1 + n) % n, { tint: [255, 60, 60], alpha: 0.4 }), ox, oy, W, H);
    ctx.drawImage(frameCanvas((st.frame + 1) % n, { tint: [60, 140, 255], alpha: 0.4 }), ox, oy, W, H);
  }
  ctx.drawImage(main, ox, oy, W, H);
  if (st.grid && z >= 6) {
    ctx.beginPath();
    for (let x = 0; x <= doc.width; x++) { ctx.moveTo(ox + x * z + 0.5, oy); ctx.lineTo(ox + x * z + 0.5, oy + H); }
    for (let y = 0; y <= doc.height; y++) { ctx.moveTo(ox, oy + y * z + 0.5); ctx.lineTo(ox + W, oy + y * z + 0.5); }
    ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath();
    for (let x = 0; x <= doc.width; x += 8) { ctx.moveTo(ox + x * z + 0.5, oy); ctx.lineTo(ox + x * z + 0.5, oy + H); }
    for (let y = 0; y <= doc.height; y += 8) { ctx.moveTo(ox, oy + y * z + 0.5); ctx.lineTo(ox + W, oy + y * z + 0.5); }
    ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.stroke();
  }
  if (st.iso || doc.meta.mode === "iso") {
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, W, H); ctx.clip(); ctx.beginPath();
    for (let k = -doc.height * 2; k < doc.width + doc.height * 2; k += 4) {
      ctx.moveTo(ox + k * z, oy); ctx.lineTo(ox + (k + doc.height * 2) * z, oy + H);
      ctx.moveTo(ox + k * z, oy + H); ctx.lineTo(ox + (k + doc.height * 2) * z, oy);
    }
    ctx.strokeStyle = "rgba(62,224,255,.16)"; ctx.stroke(); ctx.restore();
  }
  // origin
  const [gx, gy] = doc.origin;
  ctx.strokeStyle = "#3ee0ff"; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(ox + gx * z + z / 2, oy + gy * z - 4); ctx.lineTo(ox + gx * z + z / 2, oy + gy * z + z + 4);
  ctx.moveTo(ox + gx * z - 4, oy + gy * z + z / 2); ctx.lineTo(ox + gx * z + z + 4, oy + gy * z + z / 2); ctx.stroke();
  // symmetry axes
  ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(255,79,163,.6)";
  if (st.symX) { ctx.beginPath(); ctx.moveTo(ox + W / 2 + 0.5, oy); ctx.lineTo(ox + W / 2 + 0.5, oy + H); ctx.stroke(); }
  if (st.symY) { ctx.beginPath(); ctx.moveTo(ox, oy + H / 2 + 0.5); ctx.lineTo(ox + W, oy + H / 2 + 0.5); ctx.stroke(); }
  if (st.sel) { const s = st.sel; ctx.strokeStyle = "#fff"; ctx.strokeRect(ox + s.x * z + 0.5, oy + s.y * z + 0.5, s.w * z, s.h * z); }
  ctx.setLineDash([]);
  // lint marks
  const now = performance.now();
  st.marks = st.marks.filter((m) => m.until > now);
  for (const m of st.marks) { ctx.strokeStyle = m.color; ctx.lineWidth = 2; ctx.strokeRect(ox + m.x * z - 2, oy + m.y * z - 2, z + 4, z + 4); }
  if (st.marks.length) st.dirty = true;
  // hover brush
  if (st.hover) {
    const b = brushSize(), [hx, hy] = st.hover, o = Math.floor((b - 1) / 2);
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1;
    ctx.strokeRect(ox + (hx - o) * z + 0.5, oy + (hy - o) * z + 0.5, b * z - 1, b * z - 1);
  }
  ctx.strokeStyle = "#2a2e40"; ctx.strokeRect(ox - 0.5, oy - 0.5, W + 1, H + 1);
  if (performance.now() < pulseUntil) { ctx.strokeStyle = `rgba(255,79,163,${(pulseUntil - performance.now()) / 700})`; ctx.lineWidth = 3; ctx.strokeRect(ox - 3, oy - 3, W + 6, H + 6); }
}

// ---------------- painting
const brushSize = () => (["pencil", "eraser", "dither", "shade"].includes(st.tool) ? st.brush : 1);
function symPts(x, y) {
  const p = [[x, y]];
  if (st.symX) p.push([doc.width - 1 - x, y]);
  if (st.symY) p.slice().forEach(([a, b]) => p.push([a, doc.height - 1 - b]));
  return p;
}
function setPx(c, x, y, v) { if (x >= 0 && y >= 0 && x < doc.width && y < doc.height) c[y * doc.width + x] = v; }
function getPx(c, x, y) { return x >= 0 && y >= 0 && x < doc.width && y < doc.height ? c[y * doc.width + x] : 0; }
function stamp(c, x, y, v, mode) {
  const b = brushSize(), o = Math.floor((b - 1) / 2);
  for (let dy = 0; dy < b; dy++) for (let dx = 0; dx < b; dx++) for (const [px, py] of symPts(x - o + dx, y - o + dy)) {
    if (mode === "dither" && (px + py) % 2) continue;
    if (mode === "shade") {
      const cur = getPx(c, px, py); if (!cur) continue;
      const nv = Math.max(1, Math.min(doc.palette.length - 1, cur + v));
      setPx(c, px, py, nv); continue;
    }
    setPx(c, px, py, v);
  }
}
function linePts(x0, y0, x1, y1) {
  const pts = [], dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) { pts.push([x0, y0]); if (x0 === x1 && y0 === y1) return pts; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
function ellipsePts(x, y, w, h, fill) {
  if (w <= 0 || h <= 0) return [];
  const cx = x + (w - 1) / 2, cy = y + (h - 1) / 2, rx = w / 2, ry = h / 2, inside = new Set();
  for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) if (((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1 + 1e-9) inside.add(px + "," + py);
  const out = [];
  for (const s of inside) { const [px, py] = s.split(",").map(Number); if (fill || !inside.has(px + 1 + "," + py) || !inside.has(px - 1 + "," + py) || !inside.has(px + "," + (py + 1)) || !inside.has(px + "," + (py - 1))) out.push([px, py]); }
  return out;
}
function rectPts(x0, y0, x1, y1, fill) {
  const out = [], [a, b] = [Math.min(x0, x1), Math.max(x0, x1)], [c, d] = [Math.min(y0, y1), Math.max(y0, y1)];
  for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) if (fill || x === a || x === b || y === c || y === d) out.push([x, y]);
  return out;
}
function flood(c, x, y, v) {
  const w = doc.width, h = doc.height, t = getPx(c, x, y);
  if (t === v || x < 0 || y < 0 || x >= w || y >= h) return;
  const q = [[x, y]]; c[y * w + x] = v;
  while (q.length) { const [cx, cy] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && c[ny * w + nx] === t) { c[ny * w + nx] = v; q.push([nx, ny]); } } }
}
function pickColor(x, y) {
  for (let li = doc.layers.length - 1; li >= 0; li--) { if (!doc.layers[li].visible) continue; const v = getPx(cel(li, st.frame, false), x, y); if (v) return v; }
  return 0;
}
function cleanup(c) {
  const src = c.slice(); let n = 0;
  for (let y = 0; y < doc.height; y++) for (let x = 0; x < doc.width; x++) {
    const v = src[y * doc.width + x]; if (!v) continue;
    const nb = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) nb.push(getPx(src, x + dx, y + dy));
    if (!nb.includes(v)) { const cnt = {}; nb.forEach((k) => (cnt[k] = (cnt[k] || 0) + 1)); const [best, num] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; if (num >= 6) { c[y * doc.width + x] = +best; n++; } }
  }
  return n;
}

let stroke = null;
function toPx(e) { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left - st.ox) / st.zoom), Math.floor((e.clientY - r.top - st.oy) / st.zoom)]; }
let spaceDown = false;
stage.addEventListener("contextmenu", (e) => e.preventDefault());
stage.addEventListener("pointerdown", (e) => {
  if (!doc) return;
  stage.setPointerCapture(e.pointerId);
  if (e.button === 1 || spaceDown) { stroke = { pan: true, sx: e.clientX, sy: e.clientY, ox: st.ox, oy: st.oy }; stage.classList.add("pan"); return; }
  const [x, y] = toPx(e), alt = e.button === 2;
  const L = doc.layers[st.layer];
  if (!L.visible && !["picker", "select"].includes(st.tool)) { toast("La capa está oculta"); return; }
  dragging = true;
  const c = cel();
  const color = alt ? st.sec : st.prim;
  stroke = { x0: x, y0: y, last: [x, y], color, alt, c, orig: c.slice(), pts: [[x, y]] };
  if (!["picker", "select"].includes(st.tool)) pushUndo();
  switch (st.tool) {
    case "pencil": stamp(c, x, y, color); break;
    case "eraser": stamp(c, x, y, 0); break;
    case "dither": stamp(c, x, y, color, "dither"); break;
    case "shade": stamp(c, x, y, alt ? -1 : 1, "shade"); break;
    case "fill": for (const [px, py] of symPts(x, y)) flood(c, px, py, color); break;
    case "picker": { const v = pickColor(x, y); if (alt) st.sec = v; else st.prim = v; renderPalette(); break; }
    case "move": if (st.sel) { const s = st.sel; stroke.float = []; for (let yy = s.y; yy < s.y + s.h; yy++) for (let xx = s.x; xx < s.x + s.w; xx++) { stroke.float.push([xx, yy, getPx(c, xx, yy)]); setPx(c, xx, yy, 0); } stroke.base = c.slice(); stroke.sel0 = { ...s }; } break;
  }
  st.dirty = true;
});
stage.addEventListener("pointermove", (e) => {
  if (!doc) return;
  const [x, y] = toPx(e);
  st.hover = [x, y]; st.dirty = true;
  $("#sPos").textContent = x >= 0 && y >= 0 && x < doc.width && y < doc.height ? `x ${x}  y ${y}  · índice ${pickColor(x, y)}` : "–";
  if (!stroke) return;
  if (stroke.pan) { st.ox = stroke.ox + e.clientX - stroke.sx; st.oy = stroke.oy + e.clientY - stroke.sy; return; }
  const c = stroke.c, [lx, ly] = stroke.last;
  if (lx === x && ly === y) return;
  const shift = e.shiftKey;
  switch (st.tool) {
    case "pencil": case "eraser": case "dither": case "shade": {
      const seg = linePts(lx, ly, x, y).slice(1);
      for (const [px, py] of seg) {
        if (st.tool === "pencil" && st.pp && st.brush === 1 && !st.symX && !st.symY) {
          stroke.pts.push([px, py]);
          const p = stroke.pts, n = p.length;
          if (n >= 3) { const [a, b, d] = [p[n - 3], p[n - 2], p[n - 1]]; if (Math.abs(a[0] - d[0]) === 1 && Math.abs(a[1] - d[1]) === 1 && (b[0] === a[0] || b[1] === a[1])) { setPx(c, b[0], b[1], stroke.orig[b[1] * doc.width + b[0]]); p.splice(n - 2, 1); } }
        }
        if (st.tool === "pencil") stamp(c, px, py, stroke.color);
        else if (st.tool === "eraser") stamp(c, px, py, 0);
        else if (st.tool === "dither") stamp(c, px, py, stroke.color, "dither");
        else stamp(c, px, py, stroke.alt ? -1 : 1, "shade");
      }
      break;
    }
    case "line": case "rect": case "ellipse": {
      let [x1, y1] = [x, y];
      if (shift && st.tool === "line") { const dx = x - stroke.x0, dy = y - stroke.y0; if (Math.abs(dx) > Math.abs(dy) * 2) y1 = stroke.y0; else if (Math.abs(dy) > Math.abs(dx) * 2) x1 = stroke.x0; else { const m = Math.max(Math.abs(dx), Math.abs(dy)); x1 = stroke.x0 + Math.sign(dx) * m; y1 = stroke.y0 + Math.sign(dy) * m; } }
      if (shift && st.tool !== "line") { const m = Math.max(Math.abs(x - stroke.x0), Math.abs(y - stroke.y0)); x1 = stroke.x0 + Math.sign(x - stroke.x0 || 1) * m; y1 = stroke.y0 + Math.sign(y - stroke.y0 || 1) * m; }
      const fill = e.ctrlKey || e.metaKey;
      let pts;
      if (st.tool === "line") pts = linePts(stroke.x0, stroke.y0, x1, y1);
      else if (st.tool === "rect") pts = rectPts(stroke.x0, stroke.y0, x1, y1, fill);
      else pts = ellipsePts(Math.min(stroke.x0, x1), Math.min(stroke.y0, y1), Math.abs(x1 - stroke.x0) + 1, Math.abs(y1 - stroke.y0) + 1, fill);
      st.preview = pts.flatMap(([a, b]) => symPts(a, b)).map(([a, b]) => [a, b, stroke.color]);
      break;
    }
    case "select": { const a = Math.min(stroke.x0, x), b = Math.min(stroke.y0, y); st.sel = { x: Math.max(0, a), y: Math.max(0, b), w: Math.min(doc.width, Math.max(stroke.x0, x) + 1) - Math.max(0, a), h: Math.min(doc.height, Math.max(stroke.y0, y) + 1) - Math.max(0, b) }; break; }
    case "move": {
      const dx = x - stroke.x0, dy = y - stroke.y0;
      if (stroke.float) { c.set(stroke.base); for (const [fx, fy, v] of stroke.float) if (v) setPx(c, fx + dx, fy + dy, v); st.sel = { ...stroke.sel0, x: stroke.sel0.x + dx, y: stroke.sel0.y + dy }; }
      else { const src = stroke.orig; c.fill(0); for (let yy = 0; yy < doc.height; yy++) for (let xx = 0; xx < doc.width; xx++) { const v = src[yy * doc.width + xx]; if (v) setPx(c, xx + dx, yy + dy, v); } }
      break;
    }
    case "picker": { const v = pickColor(x, y); if (stroke.alt) st.sec = v; else st.prim = v; renderPalette(); break; }
  }
  stroke.last = [x, y];
});
function endStroke() {
  if (!stroke) return;
  stage.classList.remove("pan");
  const s = stroke; stroke = null; dragging = false;
  if (s.pan) return;
  if (st.preview) { for (const [x, y, v] of st.preview) setPx(s.c, x, y, v); st.preview = null; }
  if (!["picker", "select"].includes(st.tool)) {
    if (s.c.every((v, i) => v === s.orig[i])) undo.pop(); else changed();
  }
  if (pendingRemote) { pendingRemote = false; reloadCurrent(true); }
  st.dirty = true;
}
stage.addEventListener("pointerup", endStroke);
stage.addEventListener("pointercancel", endStroke);
stage.addEventListener("pointerleave", () => { st.hover = null; st.dirty = true; });
stage.addEventListener("wheel", (e) => {
  if (!doc) return; e.preventDefault();
  const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const nz = Math.max(1, Math.min(80, st.zoom + (e.deltaY < 0 ? (st.zoom >= 8 ? 2 : 1) : -(st.zoom > 8 ? 2 : 1))));
  st.ox = Math.round(mx - (mx - st.ox) * nz / st.zoom); st.oy = Math.round(my - (my - st.oy) * nz / st.zoom); st.zoom = nz;
  $("#zoomV").textContent = "×" + nz; st.dirty = true;
}, { passive: false });

// ---------------- change propagation
function changed(save = true) {
  setPal(); st.dirty = true;
  renderPalette(); renderLayers(); renderFrames(); renderTags();
  $("#sSize").textContent = `${doc.width}×${doc.height} · ${doc.frames.length} frame(s) · ${doc.layers.length} capa(s)`;
  $("#zoomV").textContent = "×" + st.zoom;
  $("#fDur").value = doc.frames[st.frame].duration;
  $("#pvBg").value = doc.meta.bg || "#2b2f3a";
  $("#lOp").value = Math.round((doc.layers[st.layer].opacity ?? 1) * 100);
  sendUiState();
  if (save) scheduleSave();
}

// ---------------- palette panel
function renderPalette() {
  if (!doc) return;
  const box = $("#swatches");
  box.innerHTML = "";
  doc.palette.forEach((c, i) => {
    const d = document.createElement("div");
    d.className = "sw" + (c ? "" : " t") + (i === st.prim ? " p" : "") + (i === st.sec ? " s" : "");
    if (c) d.style.background = c;
    d.textContent = i < CHARS.length ? CHARS[i] : "";
    d.title = `${i}: ${c || "transparente"}`;
    d.onclick = () => { st.prim = i; renderPalette(); sendUiState(); };
    d.oncontextmenu = (e) => { e.preventDefault(); st.sec = i; renderPalette(); };
    box.append(d);
  });
  const sw = (el, i) => { el.style.background = doc.palette[i] || "repeating-conic-gradient(#3a3e50 0 25%,#262a38 0 50%) 0 0/8px 8px"; };
  sw($("#cPrim"), st.prim); sw($("#cSec"), st.sec);
  $("#cEdit").value = doc.palette[st.prim] || "#000000";
  $("#cEdit").disabled = st.prim === 0;
  $("#palCount").textContent = doc.palette.length - 1 + " colores";
  $("#sCol").textContent = `color ${st.prim} ${doc.palette[st.prim] || "transparente"}`;
}
$("#cEdit").addEventListener("input", (e) => { if (!doc || !st.prim) return; doc.palette[st.prim] = e.target.value; setPal(); st.dirty = true; renderPalette(); });
$("#cEdit").addEventListener("change", () => { pushUndo(); changed(); });
$("#cAdd").onclick = () => { if (doc.palette.length >= 256) return toast("Paleta llena (255)"); pushUndo(); doc.palette.push(doc.palette[st.prim] || "#ffffff"); st.prim = doc.palette.length - 1; changed(); };
$("#cDel").onclick = () => {
  const last = doc.palette.length - 1; if (last < 2) return;
  if (Object.values(doc.cels).some((c) => c.includes(last))) return toast(`El color ${last} está en uso`);
  pushUndo(); doc.palette.pop(); st.prim = Math.min(st.prim, last - 1); st.sec = Math.min(st.sec, last - 1); changed();
};
$("#palPreset").onchange = (e) => {
  const p = PRESETS[e.target.value]; e.target.value = "";
  if (!p || !doc) return;
  const used = Math.max(0, ...Object.values(doc.cels).map((c) => Math.max(...c)));
  if (used > p.length) return toast(`Los píxeles usan el índice ${used}; esa paleta tiene ${p.length}`);
  pushUndo(); doc.palette = [null, ...p]; changed();
};

// ---------------- layers panel
function renderLayers() {
  const box = $("#layers"); box.innerHTML = "";
  doc.layers.forEach((L, i) => {
    const d = document.createElement("div");
    d.className = "ly" + (i === st.layer ? " cur" : "");
    d.innerHTML = `<button title="Ver/ocultar">${L.visible ? "👁" : "—"}</button><span></span><button title="Renombrar">✎</button>`;
    d.querySelector("span").textContent = L.name;
    d.onclick = () => { st.layer = i; changed(false); };
    const [vis, ren] = d.querySelectorAll("button");
    vis.onclick = (e) => { e.stopPropagation(); pushUndo(); L.visible = !L.visible; changed(); };
    ren.onclick = (e) => { e.stopPropagation(); const n = prompt("Nombre de la capa", L.name); if (n) { pushUndo(); L.name = n.slice(0, 40); changed(); } };
    box.append(d);
  });
  $("#lyCount").textContent = doc.layers.length;
}
$("#lAdd").onclick = () => { pushUndo(); doc.layers.splice(st.layer + 1, 0, { id: nid(), name: "capa " + (doc.layers.length + 1), visible: true, opacity: 1 }); st.layer++; changed(); };
$("#lDup").onclick = () => { pushUndo(); const L = doc.layers[st.layer], N = { ...L, id: nid(), name: L.name + " copia" }; doc.layers.splice(st.layer + 1, 0, N); doc.frames.forEach((f, fi) => { const c = doc.cels[`${L.id}:${f.id}`]; if (c) doc.cels[`${N.id}:${f.id}`] = c.slice(); }); st.layer++; changed(); };
$("#lDel").onclick = () => { if (doc.layers.length < 2) return; pushUndo(); const L = doc.layers.splice(st.layer, 1)[0]; for (const k of Object.keys(doc.cels)) if (k.startsWith(L.id + ":")) delete doc.cels[k]; clampSel(); changed(); };
$("#lUp").onclick = () => { if (st.layer >= doc.layers.length - 1) return; pushUndo(); const L = doc.layers.splice(st.layer, 1)[0]; doc.layers.splice(++st.layer, 0, L); changed(); };
$("#lDown").onclick = () => { if (st.layer === 0) return; pushUndo(); const L = doc.layers.splice(st.layer, 1)[0]; doc.layers.splice(--st.layer, 0, L); changed(); };
$("#lMerge").onclick = () => { if (st.layer === 0) return; pushUndo(); doc.frames.forEach((f, fi) => { const top = cel(st.layer, fi, false), bot = cel(st.layer - 1, fi); top.forEach((v, i) => { if (v) bot[i] = v; }); }); const L = doc.layers.splice(st.layer, 1)[0]; for (const k of Object.keys(doc.cels)) if (k.startsWith(L.id + ":")) delete doc.cels[k]; st.layer--; changed(); };
$("#lOp").oninput = (e) => { doc.layers[st.layer].opacity = e.target.value / 100; st.dirty = true; };
$("#lOp").onchange = () => { pushUndo(); changed(); };

// ---------------- frames / timeline
function renderFrames() {
  const box = $("#frames"); box.innerHTML = "";
  const tagged = new Set(); doc.tags.forEach((t) => { for (let i = t.from; i <= t.to; i++) tagged.add(i); });
  doc.frames.forEach((f, i) => {
    const d = document.createElement("div");
    d.className = "fr" + (i === st.frame ? " cur" : "") + (tagged.has(i) ? " tagged" : "");
    const c = frameCanvas(i);
    d.append(c);
    d.insertAdjacentHTML("beforeend", `<div>${i} · ${f.duration}ms</div>`);
    d.title = "Clic: ir · Mayús+clic: marcar inicio de tag";
    d.onclick = (e) => { if (e.shiftKey) { st.markFrom = i; toast(`Inicio del tag: frame ${i}`); } st.frame = i; changed(false); };
    box.append(d);
  });
  const cur = box.children[st.frame]; if (cur) cur.scrollIntoView({ block: "nearest", inline: "nearest" });
}
function renderTags() {
  const box = $("#tags"); box.innerHTML = "";
  doc.tags.forEach((t) => { const b = document.createElement("button"); b.textContent = `${t.name} ${t.from}–${t.to} ×`; b.title = "Quitar tag"; b.onclick = () => { pushUndo(); doc.tags = doc.tags.filter((x) => x !== t); changed(); }; box.append(b); });
}
function addFrame(copy) {
  pushUndo();
  const f = { id: nid(), duration: doc.frames[st.frame].duration };
  doc.frames.splice(st.frame + 1, 0, f);
  if (copy) doc.layers.forEach((L) => { const c = doc.cels[`${L.id}:${doc.frames[st.frame].id}`]; if (c) doc.cels[`${L.id}:${f.id}`] = c.slice(); });
  st.frame++; changed();
}
$("#fAdd").onclick = () => addFrame(false);
$("#fDup").onclick = () => addFrame(true);
$("#fDel").onclick = () => { if (doc.frames.length < 2) return; pushUndo(); const f = doc.frames.splice(st.frame, 1)[0]; for (const k of Object.keys(doc.cels)) if (k.endsWith(":" + f.id)) delete doc.cels[k]; doc.tags = doc.tags.filter((t) => t.to < doc.frames.length); clampSel(); changed(); };
$("#fLeft").onclick = () => { if (!st.frame) return; pushUndo(); const f = doc.frames.splice(st.frame, 1)[0]; doc.frames.splice(--st.frame, 0, f); changed(); };
$("#fRight").onclick = () => { if (st.frame >= doc.frames.length - 1) return; pushUndo(); const f = doc.frames.splice(st.frame, 1)[0]; doc.frames.splice(++st.frame, 0, f); changed(); };
$("#fDur").onchange = (e) => { pushUndo(); doc.frames[st.frame].duration = Math.max(10, +e.target.value || 100); changed(); };
$("#tagSet").onclick = () => {
  const name = ($("#tagName").value || "").trim().replace(/[^A-Za-z0-9_]/g, "_"); if (!name) return toast("Escribe un nombre de tag (idle, walk…)");
  const a = st.markFrom ?? st.frame, b = st.frame; pushUndo();
  doc.tags = doc.tags.filter((t) => t.name !== name).concat({ name, from: Math.min(a, b), to: Math.max(a, b) }); st.markFrom = null; changed();
};
let playT = 0;
$("#fPlay").onclick = () => { st.playing = !st.playing; $("#fPlay").textContent = st.playing ? "❚❚" : "▶"; playT = performance.now(); };
function tickPlay(now) {
  requestAnimationFrame(tickPlay);
  if (!doc) return;
  if (st.playing && now - playT >= doc.frames[st.frame].duration) { playT = now; st.frame = (st.frame + 1) % doc.frames.length; st.dirty = true; $("#fDur").value = doc.frames[st.frame].duration; [...$("#frames").children].forEach((c, i) => c.classList.toggle("cur", i === st.frame)); }
  drawPreview(now); drawStack(now);
}

// ---------------- previews
let pvFrame = 0, pvT = 0;
function drawPreview(now) {
  const c = $("#pv"); if (!c.offsetParent) return;
  if (now - pvT >= doc.frames[pvFrame % doc.frames.length].duration) { pvT = now; pvFrame = (pvFrame + 1) % doc.frames.length; }
  const k = +$("#pvScale").value, x = c.getContext("2d");
  c.width = doc.width * k; c.height = doc.height * k;
  x.imageSmoothingEnabled = false; x.fillStyle = doc.meta.bg || "#2b2f3a"; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(frameCanvas(pvFrame % doc.frames.length), 0, 0, c.width, c.height);
}
let ang = 30;
function drawStack(now) {
  const c = $("#sv"); if (!c.offsetParent) return;
  if ($("#svSpin").getAttribute("aria-pressed") === "true") { ang = (now / 25) % 360; $("#svAng").value = Math.round(ang); } else ang = +$("#svAng").value;
  const gap = +$("#svGap").value, sq = $("#svSq").value / 100;
  const side = Math.ceil(Math.hypot(doc.width, doc.height)), vis = doc.layers.map((L, i) => [L, i]).filter(([L]) => L.visible);
  const k = Math.max(1, Math.floor(240 / (side + vis.length * gap)));
  c.width = side * k; c.height = Math.ceil((side * sq + vis.length * gap) * k) + 2;
  const x = c.getContext("2d"); x.imageSmoothingEnabled = false;
  x.fillStyle = doc.meta.bg || "#2b2f3a"; x.fillRect(0, 0, c.width, c.height);
  tmp.width = doc.width; tmp.height = doc.height;
  vis.forEach(([L, li], n) => {
    tctx.putImageData(layerImage(li, st.frame), 0, 0);
    x.save();
    x.translate(c.width / 2, c.height - (side * sq / 2 + n * gap) * k - 1);
    x.scale(k, k * sq); x.rotate(ang * Math.PI / 180);
    x.drawImage(tmp, -doc.width / 2, -doc.height / 2);
    x.restore();
  });
}
$("#svSpin").onclick = (e) => e.currentTarget.setAttribute("aria-pressed", e.currentTarget.getAttribute("aria-pressed") === "true" ? "false" : "true");
$("#svAng").oninput = () => $("#svSpin").setAttribute("aria-pressed", "false");
$("#pvBg").onchange = (e) => { pushUndo(); doc.meta.bg = e.target.value; changed(); };

// ---------------- lint
$("#bLint").onclick = async () => {
  if (!doc) return;
  const out = $("#lintOut");
  try {
    await doSave();
    const r = await store.act("lint", { name: doc.name });
    $("#lintScore").textContent = r.score + "/100";
    out.innerHTML = `<div class="score" style="color:${r.score >= 85 ? "var(--ok)" : r.score >= 60 ? "var(--warn)" : "var(--err)"}">${r.score}/100</div>`;
    if (!r.issues.length) out.insertAdjacentHTML("beforeend", "<div>Sin problemas. ✨</div>");
    r.issues.forEach((i) => {
      const d = document.createElement("div"); d.className = "iss " + i.level;
      d.textContent = (i.frame != null ? `[frame ${i.frame}] ` : "") + i.msg;
      d.onclick = () => { if (i.frame != null) st.frame = i.frame; const until = performance.now() + 4000; (i.at || []).forEach(([x, y]) => st.marks.push({ x, y, until, color: i.level === "warn" ? "#ffc24b" : "#3ee0ff" })); changed(false); };
      out.append(d);
    });
  } catch (e) { out.textContent = e.message; }
};
$("#bClean").onclick = () => { pushUndo(); const n = cleanup(cel()); if (!n) { undo.pop(); return toast("No hay píxeles huérfanos en esta capa"); } toast(`${n} píxel(es) huérfano(s) limpiados`); changed(); };

// ---------------- dialogs: new / resize / export / import
const sizes = [8, 16, 24, 32, 48, 64, 96, 128, 256];
$("#nSizes").innerHTML = sizes.map((s) => `<button type="button" data-s="${s}">${s}</button>`).join("");
$("#nSizes").onclick = (e) => { const s = e.target.dataset.s; if (s) { $("#nW").value = s; $("#nH").value = s; } };
$("#bNew").onclick = () => { $("#nName").value = "spr_nuevo_" + Math.floor(Math.random() * 900 + 100); $("#dNew").showModal(); };
$("#dNew").addEventListener("close", async () => {
  if ($("#dNew").returnValue !== "ok") return;
  const name = $("#nName").value.trim();
  if (!/^[A-Za-z0-9_\-]{1,64}$/.test(name)) return toast("Nombre: letras, números, _ o -");
  const w = clampN($("#nW").value, 1, 1024), h = clampN($("#nH").value, 1, 1024);
  const d = newDoc(name, w, h, PRESETS[$("#nPal").value], clampN($("#nFrames").value, 1, 512), $("#nMode").value, $("#nBg").value);
  if ($("#nMode").value === "stack") { d.layers = Array.from({ length: Math.min(16, Math.max(4, Math.round(h / 2))) }, (_, i) => ({ id: nid(), name: "slice " + i, visible: true, opacity: 1 })); d.origin = [Math.floor(w / 2), Math.floor(h / 2)]; }
  try { await store.save(d, null); doc = null; await open(name); await refreshList(); } catch (e) { toast(e.message); }
});
const clampN = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v || a)));
$("#bResize").onclick = () => { if (!doc) return; $("#rW").value = doc.width; $("#rH").value = doc.height; $("#rOx").value = doc.origin[0]; $("#rOy").value = doc.origin[1]; $("#dResize").showModal(); };
$("#dResize").addEventListener("close", () => {
  if ($("#dResize").returnValue !== "ok") return;
  const w = clampN($("#rW").value, 1, 1024), h = clampN($("#rH").value, 1, 1024), an = $("#rAnchor").value;
  pushUndo();
  if (w !== doc.width || h !== doc.height) {
    const ox = an.includes("left") ? 0 : an.includes("right") ? w - doc.width : Math.floor((w - doc.width) / 2);
    const oy = an.includes("top") ? 0 : an.includes("bottom") ? h - doc.height : Math.floor((h - doc.height) / 2);
    for (const [k, c] of Object.entries(doc.cels)) { const n = new Uint8Array(w * h); for (let y = 0; y < doc.height; y++) for (let x = 0; x < doc.width; x++) { const nx = x + ox, ny = y + oy; if (nx >= 0 && ny >= 0 && nx < w && ny < h) n[ny * w + nx] = c[y * doc.width + x]; } doc.cels[k] = n; }
    doc.width = w; doc.height = h; st.sel = null;
    doc.origin = [+$("#rOx").value + ox, +$("#rOy").value + oy];
  } else doc.origin = [+$("#rOx").value, +$("#rOy").value];
  fit(); changed();
});
$("#bExport").onclick = () => { if (!doc) return; $("#eNote").textContent = LOCAL ? "Se guarda en tu PC. GameMaker corta solo los archivos *_stripN.png al importarlos." : "Modo navegador: se descargan los archivos."; $("#eDir").disabled = !LOCAL; $("#dExport").showModal(); };
$("#dExport").addEventListener("close", async () => {
  if ($("#dExport").returnValue !== "ok") return;
  const fmt = $("#eFmt").value, scale = +$("#eScale").value;
  if (LOCAL) {
    try { await doSave(); const r = await store.act("export", { name: doc.name, format: fmt, scale, dir: $("#eDir").value.trim() || undefined }); toast(`Exportado: ${r.files.length} archivo(s) en ${r.dir}`, 6000); } catch (e) { toast(e.message); }
  } else browserExport(fmt, scale);
});
function stripCanvas(frames, scale, li = null) {
  const c = document.createElement("canvas"); c.width = doc.width * frames.length * scale; c.height = doc.height * scale;
  const x = c.getContext("2d"); x.imageSmoothingEnabled = false;
  frames.forEach((fi, i) => {
    let src;
    if (li == null) src = frameCanvas(fi); else { src = document.createElement("canvas"); src.width = doc.width; src.height = doc.height; src.getContext("2d").putImageData(layerImage(li, fi), 0, 0); }
    x.drawImage(src, i * doc.width * scale, 0, doc.width * scale, doc.height * scale);
  });
  return c;
}
function download(name, blobOrCanvas) {
  const go = (b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  if (blobOrCanvas instanceof Blob) go(blobOrCanvas); else blobOrCanvas.toBlob(go, "image/png");
}
function browserExport(fmt, scale) {
  const base = doc.name.startsWith("spr_") ? doc.name.replace(/[^A-Za-z0-9_]/g, "_") : "spr_" + doc.name.replace(/[^A-Za-z0-9_]/g, "_");
  const all = doc.frames.map((_, i) => i);
  const groups = doc.tags.length ? doc.tags.map((t) => [`${base}_${t.name}`, all.slice(t.from, t.to + 1)]) : [[base, all]];
  if (fmt === "gamemaker") {
    const gml = ["// HighlyArtMon export"];
    groups.forEach(([n, fr]) => { download(`${n}_strip${fr.length}.png`, stripCanvas(fr, scale)); gml.push(`${n} = sprite_add("${n}_strip${fr.length}.png", ${fr.length}, false, false, ${doc.origin[0] * scale}, ${doc.origin[1] * scale});`); });
    download(`${base}_load.gml`, new Blob([gml.join("\n") + "\n"], { type: "text/plain" }));
  } else if (fmt === "frames") groups.forEach(([n, fr]) => fr.forEach((fi, k) => download(`${n}_${k}.png`, stripCanvas([fi], scale))));
  else if (fmt === "sheet") {
    download(`${base}_sheet.png`, stripCanvas(all, scale));
    const meta = { frames: Object.fromEntries(all.map((i) => [`${base} ${i}.png`, { frame: { x: i * doc.width * scale, y: 0, w: doc.width * scale, h: doc.height * scale }, duration: doc.frames[i].duration }])), meta: { app: "HighlyArtMon", image: `${base}_sheet.png`, frameTags: doc.tags, pivot: { x: doc.origin[0], y: doc.origin[1] } } };
    download(`${base}_sheet.json`, new Blob([JSON.stringify(meta, null, 1)], { type: "application/json" }));
  } else doc.layers.forEach((L, li) => download(`${base}_${L.name.replace(/[^A-Za-z0-9_]/g, "_")}_strip${all.length}.png`, stripCanvas(all, scale, li)));
  download(`${doc.name}.ham.json`, new Blob([JSON.stringify(encodeDoc(doc))], { type: "application/json" }));
}
$("#bImport").onclick = () => $("#fImport").click();
$("#fImport").onchange = async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    let d;
    if (f.name.endsWith(".json")) { d = JSON.parse(await f.text()); if (d.app !== "highlyartmon") throw new Error("no es un archivo .ham.json"); }
    else d = await imageToDoc(f);
    let name = d.name, n = 2; const names = (await store.list()).map((p) => p.name);
    while (names.includes(name)) name = `${d.name}_${n++}`;
    d.name = name; d.version = 0;
    await store.save(d, null); doc = null; await open(name); await refreshList();
    toast(`Importado como ${name} (${d.width}×${d.height}, ${d.palette.length - 1} colores)`);
  } catch (err) { toast("Importar falló: " + err.message); }
};
async function imageToDoc(file) {
  const bmp = await createImageBitmap(file);
  if (bmp.width * bmp.height > 2048 * 2048) throw new Error("imagen demasiado grande");
  const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
  const x = c.getContext("2d"); x.drawImage(bmp, 0, 0);
  let px = x.getImageData(0, 0, c.width, c.height).data, w = c.width, h = c.height;
  const same = (i, j) => px[i] === px[j] && px[i + 1] === px[j + 1] && px[i + 2] === px[j + 2] && px[i + 3] === px[j + 3];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  let g = 0;
  for (let y = 0; y < h && g !== 1; y += Math.max(1, Math.floor(h / 24))) { let run = 1; for (let xx = 1; xx < w; xx++) { if (same((y * w + xx) * 4, (y * w + xx - 1) * 4)) run++; else { g = gcd(g, run); run = 1; } } g = gcd(g, run); }
  const k = g > 1 && g <= 64 && w % g === 0 ? g : 1;
  if (k > 1) { const nw = w / k, nh = Math.floor(h / k), np = new Uint8ClampedArray(nw * nh * 4); for (let y = 0; y < nh; y++) for (let xx = 0; xx < nw; xx++) { const s = ((y * k + (k >> 1)) * w + xx * k + (k >> 1)) * 4; np.set(px.subarray(s, s + 4), (y * nw + xx) * 4); } px = np; w = nw; h = nh; }
  if (w > 1024 || h > 1024) throw new Error("más de 1024 px tras reducir");
  const count = new Map();
  for (let i = 0; i < w * h; i++) if (px[i * 4 + 3] >= 128) { const c2 = (px[i * 4] << 16) | (px[i * 4 + 1] << 8) | px[i * 4 + 2]; count.set(c2, (count.get(c2) || 0) + 1); }
  const cols = [];
  for (const [c2] of [...count].sort((a, b) => b[1] - a[1])) { const r = c2 >> 16, gg = (c2 >> 8) & 255, b = c2 & 255; if (cols.every(([r2, g2, b2]) => (r - r2) ** 2 + (gg - g2) ** 2 + (b - b2) ** 2 > (count.size > 64 ? 700 : 0))) cols.push([r, gg, b]); if (cols.length >= 64) break; }
  const name = file.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_\-]/g, "_").slice(0, 60) || "importado";
  const d = newDoc(name, w, h, cols.map(([r, gg, b]) => "#" + [r, gg, b].map((v) => v.toString(16).padStart(2, "0")).join("")));
  const idx = new Uint8Array(w * h), cache = new Map();
  for (let i = 0; i < w * h; i++) {
    if (px[i * 4 + 3] < 128) continue;
    const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2], c2 = (r << 16) | (gg << 8) | b;
    if (!cache.has(c2)) { let best = 0, bd = Infinity; cols.forEach(([r2, g2, b2], j) => { const dd = (r - r2) ** 2 + (gg - g2) ** 2 + (b - b2) ** 2; if (dd < bd) { bd = dd; best = j; } }); cache.set(c2, best + 1); }
    idx[i] = cache.get(c2);
  }
  d.cels = { [`${d.layers[0].id}:${d.frames[0].id}`]: Array.from(idx, (v) => HEX[v]).join("") };
  return d;
}
$("#bDelete").onclick = async () => {
  if (!doc || !confirm(`¿Mover ${doc.name} a la papelera?` + (LOCAL ? " (queda en ~/HighlyArtMon/.trash)" : " (se borra de este navegador)"))) return;
  await store.remove(doc.name); doc = null; const l = await refreshList(); if (l.length) open(l[0].name); else st.dirty = true;
};
$("#docSel").onchange = (e) => open(e.target.value);
$("#bUndo").onclick = () => { if (!undo.length) return; redo.push(snapshot()); restore(undo.pop()); };
$("#bRedo").onclick = () => { if (!redo.length) return; undo.push(snapshot()); restore(redo.pop()); };
$("#follow").onchange = (e) => (st.follow = e.target.checked);

// ---------------- toolbar
const TOOLS = [["pencil", "✎", "B", "Lápiz"], ["eraser", "⌫", "E", "Borrador"], ["line", "╱", "L", "Línea (Mayús: ángulos limpios)"], ["rect", "▭", "U", "Rectángulo (Ctrl: relleno, Mayús: cuadrado)"],
  ["ellipse", "◯", "C", "Elipse (Ctrl: relleno)"], ["fill", "◍", "G", "Cubo de relleno"], ["picker", "⊙", "I", "Cuentagotas"], ["select", "⬚", "S", "Selección (Supr borra, Ctrl+C/V)"],
  ["move", "✥", "M", "Mover capa o selección"], ["dither", "▚", "D", "Tramado (dither)"], ["shade", "◑", "H", "Sombrear: clic aclara, clic derecho oscurece (paleta en rampas)"]];
const tb = $("#tools");
TOOLS.forEach(([id, ic, k, label], i) => {
  if (i === 6 || i === 9) tb.insertAdjacentHTML("beforeend", '<div class="gap"></div>');
  const b = document.createElement("button"); b.innerHTML = `${ic}<small>${k}</small>`; b.title = `${label} (${k})`; b.dataset.tool = id;
  b.onclick = () => setTool(id); tb.append(b);
});
function setTool(t) { st.tool = t; [...tb.querySelectorAll("button")].forEach((b) => b.classList.toggle("on", b.dataset.tool === t)); $("#sTool").textContent = TOOLS.find((x) => x[0] === t)[3]; sendUiState(); }
const toggles = { tGrid: "grid", tOnion: "onion", tSil: "sil", tTile: "tile", tIso: "iso", tPP: "pp", tSymX: "symX", tSymY: "symY" };
for (const [id, k] of Object.entries(toggles)) $("#" + id).onclick = () => { st[k] = !st[k]; $("#" + id).setAttribute("aria-pressed", st[k]); st.dirty = true; };
$("#brush").oninput = (e) => { st.brush = +e.target.value; $("#brushV").textContent = st.brush; };
$("#zFit").onclick = () => { fit(); $("#zoomV").textContent = "×" + st.zoom; };

let clip = null;
window.addEventListener("keydown", (e) => {
  if (e.target.matches("input,select,textarea") || document.querySelector("dialog[open]")) return;
  const k = e.key, ctrl = e.ctrlKey || e.metaKey;
  if (k === " ") { spaceDown = true; stage.classList.add("pan"); e.preventDefault(); return; }
  if (ctrl && k.toLowerCase() === "z") { e.preventDefault(); (e.shiftKey ? $("#bRedo") : $("#bUndo")).click(); return; }
  if (ctrl && k.toLowerCase() === "y") { e.preventDefault(); $("#bRedo").click(); return; }
  if (ctrl && k.toLowerCase() === "n") { e.preventDefault(); $("#bNew").click(); return; }
  if (ctrl && k.toLowerCase() === "s") { e.preventDefault(); doSave(); return; }
  if (!doc) return;
  if (ctrl && k.toLowerCase() === "c" && st.sel) { const s = st.sel, c = cel(); clip = { w: s.w, h: s.h, px: [] }; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) clip.px.push(getPx(c, s.x + x, s.y + y)); toast("Copiado"); return; }
  if (ctrl && k.toLowerCase() === "v" && clip) { pushUndo(); const s = st.sel || { x: 0, y: 0 }, c = cel(); clip.px.forEach((v, i) => { if (v) setPx(c, s.x + (i % clip.w), s.y + Math.floor(i / clip.w), v); }); st.sel = { x: s.x, y: s.y, w: clip.w, h: clip.h }; setTool("move"); changed(); return; }
  if ((k === "Delete" || k === "Backspace") && st.sel) { pushUndo(); const s = st.sel, c = cel(); for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) setPx(c, x, y, 0); changed(); return; }
  if (k === "Escape") { st.sel = null; st.dirty = true; return; }
  if (k === "Enter") { $("#fPlay").click(); return; }
  if (k === ",") { st.frame = (st.frame - 1 + doc.frames.length) % doc.frames.length; changed(false); return; }
  if (k === ".") { st.frame = (st.frame + 1) % doc.frames.length; changed(false); return; }
  if (k === "x" || k === "X") { [st.prim, st.sec] = [st.sec, st.prim]; renderPalette(); return; }
  if (k === "[") { st.brush = Math.max(1, st.brush - 1); $("#brush").value = st.brush; $("#brushV").textContent = st.brush; return; }
  if (k === "]") { st.brush = Math.min(8, st.brush + 1); $("#brush").value = st.brush; $("#brushV").textContent = st.brush; return; }
  if (k === "#") { $("#tGrid").click(); return; }
  if (k === "o" || k === "O") { $("#tOnion").click(); return; }
  if (k === "0") { $("#zFit").click(); return; }
  if (k === "+" || k === "=") { st.zoom = Math.min(80, st.zoom + 1); st.dirty = true; $("#zoomV").textContent = "×" + st.zoom; return; }
  if (k === "-") { st.zoom = Math.max(1, st.zoom - 1); st.dirty = true; $("#zoomV").textContent = "×" + st.zoom; return; }
  const t = TOOLS.find((x) => x[2] === k.toUpperCase()); if (t && !ctrl) setTool(t[0]);
});
window.addEventListener("keyup", (e) => { if (e.key === " ") { spaceDown = false; stage.classList.remove("pan"); } });

function toast(msg, ms = 3200) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), ms); }
window.addEventListener("resize", () => { resize(); });
window.addEventListener("beforeunload", () => { if (saveTimer && doc) { clearTimeout(saveTimer); doSave(); } });

// ---------------- boot
(async function boot() {
  try { PRESETS = await (await fetch("palettes.json")).json(); } catch { PRESETS = { pico8: ["#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8", "#ff004d", "#ffa300", "#ffec27", "#00e436", "#29adff", "#83769c", "#ff77a8", "#ffccaa"] }; }
  const names = Object.keys(PRESETS);
  $("#nPal").innerHTML = names.map((n) => `<option ${n === "endesga32" ? "selected" : ""}>${n}</option>`).join("");
  $("#palPreset").innerHTML = `<option value="">Paleta…</option>` + names.map((n) => `<option>${n}</option>`).join("");
  setTool("pencil"); resize(); connectLive();
  const list = await refreshList();
  if (!list.length && !LOCAL) {
    // demo sprite so the browser version opens with something to look at
    const d = newDoc("spr_demo_slime", 16, 16, PRESETS["warm-ramps"] || names[0]);
    const rows = ["................", "................", "................", "................", "......1111......", "....11ddcc11....", "...1dccbbccd1...", "..1dcbb9bbbcd1..", "..1cbb99bbbbc1..", ".1dcb9bb1bb1cd1.", ".1dcbbbbbbbbcd1.", ".1ddcbbbbbbccd1.", "..1ddccccccdd1..", "...1111111111...", "................", "................"];
    const map = { 1: 1, 9: 13, b: 12, c: 11, d: 10 };
    d.cels[`${d.layers[0].id}:${d.frames[0].id}`] = rows.join("").split("").map((ch) => HEX[map[ch] ?? 0]).join("");
    await store.save(d, null); await refreshList(); await open(d.name);
  } else if (list.length) {
    const last = ls.get("ham:last");
    await open(list.some((p) => p.name === last) ? last : list[0].name);
  }
  requestAnimationFrame(draw); requestAnimationFrame(tickPlay);
})();
})();
