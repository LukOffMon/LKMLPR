// Rojo 87: utilidades compartidas por todas las páginas.
(function () {
  const API = "https://lsvyryanshcuysowlysp.supabase.co/functions/v1/rojo87/api";
  const BASE = new URL(".", location.href.replace(/[?#].*$/, "")).href;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (_) {
      return null;
    }
  }

  async function api(path, { method = "GET", body, token } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    let res;
    try {
      res = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (_) {
      throw Object.assign(new Error("Sin conexión. Revisa tu internet e intenta de nuevo."), { status: 0 });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `Error ${res.status}`), { status: res.status });
    return data;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function qrSvg(text, cell = 4) {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: cell, margin: 0, scalable: true });
  }

  let toastTimer;
  function toast(msg) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  }

  function ago(iso) {
    if (!iso) return "nunca";
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "hace un momento";
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
    if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
    const d = Math.floor(s / 86400);
    return d === 1 ? "ayer" : `hace ${d} días`;
  }

  const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);

  // Sello de goma: aro doble y estrella, con borde irregular de tinta y un giro distinto en cada casilla.
  function ensureInkFilter() {
    if (document.getElementById("r87-ink")) return;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    defs.setAttribute("width", "0");
    defs.setAttribute("height", "0");
    defs.setAttribute("aria-hidden", "true");
    defs.style.position = "absolute";
    defs.innerHTML = `<filter id="r87-ink" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6"/></filter>`;
    document.body.appendChild(defs);
  }

  // Íconos del sello (24×24, trazo). Mismos nombres que acepta la API en design.icon.
  const ICONS = {
    cubiertos: { label: "Cubiertos", d: '<path d="M7 3v7a2 2 0 0 0 2 2v9"/><path d="M5 3v5M9 3v5"/><path d="M17 21V3c-2.2 1.2-3.5 3.6-3.5 7v3H17"/>' },
    copa: { label: "Copa", d: '<path d="M6 3h12l-1 6a5 5 0 0 1-10 0z"/><path d="M12 14v6M8 21h8"/>' },
    estrella: { label: "Estrella", d: '<path d="M12 2.8l2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3L2.9 9.4l6.3-.8z" fill="currentColor"/>' },
    tijeras: { label: "Tijeras", d: '<circle cx="6" cy="6.5" r="2.8"/><circle cx="6" cy="17.5" r="2.8"/><path d="M20 4.5L8.3 15.5M14.4 13.6L20 19.5M8.3 8.5l3.4 3.2"/>' },
    taza: { label: "Taza", d: '<path d="M4 9h12v4.5A5.5 5.5 0 0 1 10.5 19h-1A5.5 5.5 0 0 1 4 13.5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5c0 1.2 1.2 1.6 1.2 3M11.6 3.5c0 1.2 1.2 1.6 1.2 3"/>' },
    huella: { label: "Huella", d: '<circle cx="6.5" cy="10" r="1.9" fill="currentColor"/><circle cx="10" cy="5.8" r="1.9" fill="currentColor"/><circle cx="14.5" cy="5.8" r="1.9" fill="currentColor"/><circle cx="18" cy="10" r="1.9" fill="currentColor"/><path d="M8 17.2c0-3 2-5.7 4.3-5.7s4.3 2.7 4.3 5.7c0 1.8-1.4 2.6-3 2.2-.9-.2-1.7-.2-2.6 0-1.6.4-3-.4-3-2.2z" fill="currentColor"/>' },
    corazon: { label: "Corazón", d: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z" fill="currentColor"/>' },
    bolsa: { label: "Bolsa", d: '<path d="M5 8.5h14l-1.2 11.5H6.2z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>' },
    gota: { label: "Gota", d: '<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z" fill="currentColor"/>' },
    rayo: { label: "Rayo", d: '<path d="M13.5 2.5L5 13.5h6l-1 8 8.5-11h-6z" fill="currentColor"/>' },
    corona: { label: "Corona", d: '<path d="M3.5 8l4.3 4 4.2-6.5 4.2 6.5 4.3-4-1.8 10.5H5.3z" fill="currentColor"/>' },
    flor: { label: "Flor", d: '<circle cx="12" cy="7" r="3.3"/><circle cx="12" cy="17" r="3.3"/><circle cx="7" cy="12" r="3.3"/><circle cx="17" cy="12" r="3.3"/><circle cx="12" cy="12" r="2" fill="currentColor"/>' },
  };
  const STAMP_STYLES = { tinta: "Sello de tinta", relleno: "Relleno", contorno: "Contorno" };
  const PATTERNS = { liso: "Liso", puntos: "Puntos", rayas: "Rayas", cuadricula: "Cuadrícula", ondas: "Ondas" };
  const FONTS = { moderna: "Moderna", compacta: "Compacta", clasica: "Clásica", maquina: "Máquina" };
  const CORNERS = { redondas: "Redondas", rectas: "Rectas" };
  const PAGES = { claro: "Clara", oscuro: "Oscura", marca: "Con tus colores" };

  // Temas listos para usar: colores y estilo pensados para cada giro.
  const THEMES = [
    { id: "rojo87", name: "Rojo 87", bg: "#0b0b0b", fg: "#efe9df", acc: "#e10600", icon: "cubiertos", stamp: "tinta", pattern: "rayas", font: "moderna", corners: "redondas", page: "oscuro" },
    { id: "taqueria", name: "Taquería", bg: "#1f3a2b", fg: "#fff6e0", acc: "#f2b33d", icon: "cubiertos", stamp: "relleno", pattern: "cuadricula", font: "compacta", corners: "redondas", page: "marca" },
    { id: "cantina", name: "Cantina", bg: "#5b1414", fg: "#f6ead8", acc: "#e9c46a", icon: "copa", stamp: "tinta", pattern: "rayas", font: "clasica", corners: "rectas", page: "oscuro" },
    { id: "cafe", name: "Café de grano", bg: "#3e2a1f", fg: "#f6ead8", acc: "#e3a857", icon: "taza", stamp: "tinta", pattern: "liso", font: "clasica", corners: "redondas", page: "marca" },
    { id: "brunch", name: "Brunch", bg: "#f8e7d8", fg: "#3a2418", acc: "#d9572b", icon: "taza", stamp: "relleno", pattern: "puntos", font: "clasica", corners: "redondas", page: "claro" },
    { id: "fonda", name: "Fonda", bg: "#ffffff", fg: "#0b0b0b", acc: "#e4572e", icon: "cubiertos", stamp: "relleno", pattern: "liso", font: "compacta", corners: "rectas", page: "claro" },
    { id: "kraft", name: "Papel kraft", bg: "#c9a77c", fg: "#2b1d0e", acc: "#7a2e14", icon: "estrella", stamp: "tinta", pattern: "liso", font: "maquina", corners: "rectas", page: "marca" },
    { id: "mar", name: "Mar", bg: "#0f4c5c", fg: "#ffffff", acc: "#7fe0d2", icon: "gota", stamp: "contorno", pattern: "ondas", font: "moderna", corners: "redondas", page: "marca" },
    { id: "noche", name: "Noche", bg: "#0d0d12", fg: "#f2f2f7", acc: "#ff5ca8", icon: "rayo", stamp: "contorno", pattern: "cuadricula", font: "maquina", corners: "redondas", page: "oscuro" },
    { id: "alta", name: "Alta cocina", bg: "#14110f", fg: "#f3ead9", acc: "#c9a45c", icon: "copa", stamp: "contorno", pattern: "liso", font: "clasica", corners: "rectas", page: "oscuro" },
  ];
  const DEFAULT_DESIGN = { icon: "cubiertos", stamp: "tinta", pattern: "liso", font: "moderna", corners: "redondas", page: "claro" };
  const designOf = (m) => ({ ...DEFAULT_DESIGN, ...(m && m.design ? m.design : {}) });

  function iconSvg(name, size = 24) {
    const ic = ICONS[name] || ICONS.estrella;
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ic.d}</svg>`;
  }
  function stampSvg(i, design = DEFAULT_DESIGN) {
    const d = { ...DEFAULT_DESIGN, ...design };
    const ic = (ICONS[d.icon] || ICONS.estrella).d;
    const turn = d.stamp === "tinta" ? ((i * 47) % 31) - 15 : 0;
    const inner = `<g transform="translate(10.4 10.4) scale(.8)" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ic}</g>`;
    if (d.stamp === "relleno") {
      return `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="currentColor"/><g style="color:var(--c-bg)" stroke="currentColor">${inner}</g></svg>`;
    }
    if (d.stamp === "contorno") {
      return `<svg viewBox="0 0 40 40" aria-hidden="true" stroke="currentColor"><circle cx="20" cy="20" r="17" fill="none" stroke-width="2.2"/>${inner}</svg>`;
    }
    return `<svg viewBox="0 0 40 40" aria-hidden="true" style="transform:rotate(${turn}deg)"><g filter="url(#r87-ink)" stroke="currentColor">
      <circle cx="20" cy="20" r="17" fill="none" stroke-width="2.6"/><circle cx="20" cy="20" r="13" fill="none" stroke-width="1.1" stroke-dasharray="2 1.6"/>${inner}</g></svg>`;
  }

  // Dibuja la tarjeta de lealtad tal como se ve en Wallet, con el diseño del negocio.
  function renderCard(el, m, card, { qr = true, popIndex = -1 } = {}) {
    ensureInkFilter();
    const d = designOf(m);
    const total = m.stamps_required;
    const stamps = card ? card.stamps : 0;
    el.className = `loyalty pat-${d.pattern} font-${d.font} corners-${d.corners}`;
    el.style.setProperty("--c-bg", m.color_bg);
    el.style.setProperty("--c-fg", m.color_fg);
    el.style.setProperty("--c-acc", m.color_accent);
    const brand = m.logo_png ? `<img src="${m.logo_png}" alt="${esc(m.name)}">` : esc(m.name);
    let dots = "";
    for (let i = 0; i < total; i++) {
      const on = i < stamps;
      dots += `<div class="stamp${on ? " on" : ""}${i === popIndex ? " pop" : ""}">${on ? stampSvg(i, d) : ""}</div>`;
    }
    const cols = total <= 6 ? total : total <= 10 ? 5 : 6;
    el.innerHTML = `
      <div class="top">
        <div class="brand">${brand}</div>
        <div class="right"><div class="lbl">Premios</div><div class="val">${card ? card.rewards_available : 0}</div></div>
      </div>
      <div class="stamps" style="grid-template-columns:repeat(${cols},1fr)" role="img" aria-label="${stamps} de ${total} sellos">${dots}</div>
      <div class="meta">
        <div><div class="lbl">Recompensa</div><div class="val">${esc(m.reward_text)}</div></div>
        <div class="right"><div class="lbl">Sellos</div><div class="val">${stamps} de ${total}</div></div>
      </div>
      ${card ? `<div class="meta" style="margin-top:10px"><div><div class="lbl">Cliente</div><div class="val">${esc(card.name.split(" ")[0])}</div></div></div>` : ""}
      ${qr && card ? `<div class="qr">${qrSvg("R87:" + card.serial)}<div class="code">${esc(card.serial.slice(0, 8).toUpperCase())}</div></div>` : ""}`;
  }

  // Páginas del cliente (unirse y tarjeta): toman los colores del negocio.
  function applyPageTheme(m) {
    const d = designOf(m);
    const root = document.documentElement;
    root.dataset.theme = d.page === "oscuro" ? "oscuro" : "claro";
    root.classList.toggle("page-marca", d.page === "marca");
    if (d.page === "marca") {
      root.style.setProperty("--brand-bg", m.color_bg);
      root.style.setProperty("--brand-fg", m.color_fg);
      root.style.setProperty("--brand-acc", m.color_accent);
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = d.page === "marca" ? m.color_bg : d.page === "oscuro" ? "#12101f" : "#ffffff";
  }

  // Tema de la web de Rojo 87 (automático, claro, oscuro o alto contraste), guardado en este navegador.
  const SITE_THEMES = { auto: "Automático", claro: "Claro", oscuro: "Oscuro", contraste: "Alto contraste" };
  function setSiteTheme(t) {
    if (!SITE_THEMES[t]) t = "auto";
    store("r87_theme", t === "auto" ? null : t);
    if (t === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    document.querySelectorAll("[data-site-theme]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.siteTheme === t)));
  }
  function mountThemePicker(el) {
    if (!el) return;
    const current = store("r87_theme") || "auto";
    el.innerHTML = `<details class="theme-picker"><summary aria-label="Cambiar tema de la página"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor"/></svg><span>Tema</span></summary>
      <div class="theme-menu" role="group" aria-label="Tema de la página">${Object.entries(SITE_THEMES).map(([k, v]) =>
        `<button type="button" data-site-theme="${k}" aria-pressed="${k === current}">${v}</button>`).join("")}</div></details>`;
    el.querySelectorAll("[data-site-theme]").forEach((b) => b.addEventListener("click", () => {
      setSiteTheme(b.dataset.siteTheme);
      b.closest("details").open = false;
    }));
  }

  // Recorrido guiado: resalta un elemento a la vez con una explicación y botones para avanzar.
  function tour(steps, { onEnd } = {}) {
    let i = 0;
    const layer = document.createElement("div");
    layer.className = "tour";
    layer.innerHTML = `<div class="tour-spot"></div><div class="tour-tip" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
      <p class="tour-count"></p><h3 id="tourTitle"></h3><p class="tour-text"></p>
      <div class="tour-actions"><button type="button" class="btn sm ghost" data-t="skip">Saltar</button><span class="grow"></span>
      <button type="button" class="btn sm" data-t="prev">Atrás</button><button type="button" class="btn sm gold" data-t="next">Siguiente</button></div></div>`;
    document.body.appendChild(layer);
    const spot = layer.querySelector(".tour-spot"), tip = layer.querySelector(".tour-tip");
    const end = () => {
      layer.remove();
      removeEventListener("resize", place);
      removeEventListener("keydown", onKey);
      onEnd && onEnd();
    };
    function place() {
      const s = steps[i], target = document.querySelector(s.el);
      if (!target) return;
      const r = target.getBoundingClientRect(), pad = 8;
      Object.assign(spot.style, { top: `${r.top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
      // En celular la explicación va fija abajo para no tapar lo que se resalta.
      if (innerWidth < 640) {
        Object.assign(tip.style, { top: "auto", bottom: "12px", left: "12px" });
        return;
      }
      tip.style.bottom = "auto";
      const below = r.bottom + 16 + tip.offsetHeight < innerHeight || r.top < tip.offsetHeight + 24;
      const top = below ? Math.min(r.bottom + 16, innerHeight - tip.offsetHeight - 12) : r.top - tip.offsetHeight - 16;
      const left = Math.min(Math.max(12, r.left), innerWidth - tip.offsetWidth - 12);
      Object.assign(tip.style, { top: `${Math.max(12, top)}px`, left: `${left}px` });
    }
    function show() {
      const s = steps[i], target = document.querySelector(s.el);
      if (s.before) s.before();
      layer.querySelector(".tour-count").textContent = `Paso ${i + 1} de ${steps.length}`;
      layer.querySelector("#tourTitle").textContent = s.title;
      layer.querySelector(".tour-text").textContent = s.text;
      layer.querySelector('[data-t="prev"]').disabled = i === 0;
      layer.querySelector('[data-t="next"]').textContent = i === steps.length - 1 ? "Terminar" : "Siguiente";
      if (target) target.scrollIntoView({ block: innerWidth < 640 ? "start" : "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      setTimeout(place, 350);
      place();
      layer.querySelector('[data-t="next"]').focus({ preventScroll: true });
    }
    const onKey = (e) => {
      if (e.key === "Escape") end();
      if (e.key === "ArrowRight") layer.querySelector('[data-t="next"]').click();
      if (e.key === "ArrowLeft" && i > 0) layer.querySelector('[data-t="prev"]').click();
    };
    layer.addEventListener("click", (e) => {
      const t = e.target.closest("[data-t]")?.dataset.t;
      if (t === "skip") end();
      if (t === "prev" && i > 0) { i--; show(); }
      if (t === "next") { if (i === steps.length - 1) end(); else { i++; show(); } }
    });
    addEventListener("resize", place);
    addEventListener("keydown", onKey);
    show();
  }

  // Convierte una imagen subida en PNG redimensionado (para el logo y el icono del pase).
  function imageToPng(file, maxW, maxH, square = false) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        let w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        if (square) {
          canvas.width = canvas.height = maxW;
          const s = Math.min(maxW / img.width, maxW / img.height);
          w = img.width * s;
          h = img.height * s;
          canvas.getContext("2d").drawImage(img, (maxW - w) / 2, (maxW - h) / 2, w, h);
        } else {
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        }
        URL.revokeObjectURL(img.src);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen."));
      img.src = URL.createObjectURL(file);
    });
  }

  window.R87 = {
    API, BASE, api, store, esc, qrSvg, toast, ago, money, renderCard, imageToPng,
    stampSvg: (i, d) => (ensureInkFilter(), stampSvg(i, d)), iconSvg,
    ICONS, STAMP_STYLES, PATTERNS, FONTS, CORNERS, PAGES, THEMES, DEFAULT_DESIGN, designOf,
    applyPageTheme, SITE_THEMES, setSiteTheme, mountThemePicker, tour,
  };
})();
