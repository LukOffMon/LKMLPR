/* Rojo 87 · lógica del sitio */
(() => {
  "use strict";

  // ── Datos de contacto (por confirmar). Si whatsapp queda vacío, WhatsApp pide elegir el contacto.
  const CONFIG = { whatsapp: "", email: "" };

  const PRICES = {
    MXN: { trial: 20, carta: 290, servicio: 690, completo: 1290, cadena: 990, ticket: { min: 20, max: 600, step: 10, def: 120 } },
    USD: { trial: 1, carta: 15, servicio: 39, completo: 69, cadena: 55, ticket: { min: 1, max: 40, step: 1, def: 7 } },
    EUR: { trial: 1, carta: 15, servicio: 35, completo: 65, cadena: 49, ticket: { min: 1, max: 40, step: 1, def: 6 } }
  };
  const PLANS = ["carta", "servicio", "completo", "cadena"];
  const RECIPES = [
    { id: "fonda", lights: [1, 0, 0, 0, 0], plan: "carta" },
    { id: "cafe", lights: [1, 1, 1, 0, 0], plan: "servicio" },
    { id: "resto", lights: [1, 1, 1, 1, 1], plan: "completo" },
    { id: "bar", lights: [1, 1, 1, 0, 0], plan: "servicio" },
    { id: "alta", lights: [1, 1, 1, 1, 1], plan: "completo" },
    { id: "cadena", lights: [1, 1, 1, 1, 1], plan: "cadena" }
  ];
  const LOCALE = { es: "es-MX", en: "en-US", fr: "fr-FR", zh: "zh-CN" };
  const DEFAULT_CUR = { es: "MXN", en: "USD", fr: "EUR", zh: "USD" };
  const LANGS = Object.keys(LOCALE);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Estado
  const saved = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* modo privado */ } };
  const fromUrl = new URLSearchParams(location.search).get("lang");
  const browserLang = (navigator.language || "es").slice(0, 2);
  const state = {
    lang: [fromUrl, saved("r87.lang"), browserLang, "es"].find((l) => LANGS.includes(l)),
    cur: null,
    bill: "m",
    recipe: "resto",
    ticket: null
  };
  state.cur = PRICES[saved("r87.cur")] ? saved("r87.cur") : DEFAULT_CUR[state.lang];

  // ── Traducción
  const dict = () => window.I18N[state.lang] || window.I18N.es;
  const money = (n, cur = state.cur) => {
    const s = new Intl.NumberFormat(LOCALE[state.lang], { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
    // En es-MX el peso sale como "$": se aclara para que no se confunda con dólares.
    return state.lang === "es" && cur === "MXN" ? s + " MXN" : s;
  };
  // Para cifras grandes: el código de moneda va chiquito para que no parta la línea.
  const moneyBig = (n, cur = state.cur) => {
    const s = new Intl.NumberFormat(LOCALE[state.lang], { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
    return state.lang === "es" && cur === "MXN" ? `${s}<sup class="cur">MXN</sup>` : s;
  };
  const t = (key, vars = {}) => {
    let s = dict()[key];
    if (s === undefined) s = window.I18N.es[key];
    if (s === undefined) return key;
    if (typeof s !== "string") return s;
    const all = { trial: money(PRICES[state.cur].trial), ...vars };
    return s.replace(/\{(\w+)\}/g, (m, k) => (k in all ? all[k] : m));
  };

  const splitWords = (el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const text = child.textContent;
          // En chino se parte por carácter, pero la puntuación se queda pegada al anterior.
          const tokens = state.lang === "zh" ? (text.match(/\s+|[^\s][。，、！？：；）」』%]*/gu) || []) : text.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          tokens.forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
            const w = document.createElement("span");
            w.className = "w";
            const inner = document.createElement("span");
            inner.textContent = tok;
            inner.style.setProperty("--i", i++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
  };

  const applyI18n = () => {
    document.documentElement.lang = state.lang;
    $$("[data-i18n]").forEach((el) => {
      el.innerHTML = t(el.dataset.i18n);
      if (el.classList.contains("split")) splitWords(el);
    });
    $$(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)));
    document.title = `Rojo 87 · ${t("ft.tag").replace(/\.$/, "").replace(/。$/, "")}`;
    renderFloorTags();
    renderRecipes();
    renderPlans();
    renderCalc(true);
    renderFaq();
    renderLeadTypes();
    renderDemo();
    if (window.ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh());
  };

  // ── Plano del salón (escena del problema)
  const FLOOR = [
    [150, 200], [380, 190], [610, 200], [840, 190],
    [160, 370], [390, 380], [620, 370], [850, 380],
    [150, 540], [380, 550], [610, 540], [840, 520]
  ];
  const REASONS = ["p.call", "p.round", "p.bill", "p.call", "p.round", "p.call", "p.bill", "p.round", "p.call", "p.bill", "p.round", "p.call"];
  const LIGHT_ORDER = [5, 0, 9, 3, 6, 11, 1, 8, 2, 10, 4, 7];
  const buildFloor = () => {
    const g = $("#floorTables");
    g.innerHTML = FLOOR.map(([x, y], i) => {
      const round = i % 3 === 1;
      const table = round
        ? `<circle r="42" fill="#0b0b0b" stroke="#efe9df" stroke-width="2"/><circle r="30" fill="url(#hatchFine)" opacity=".35"/>`
        : `<rect x="-52" y="-36" width="104" height="72" rx="8" fill="#0b0b0b" stroke="#efe9df" stroke-width="2"/><rect x="-42" y="-26" width="84" height="52" fill="url(#hatchFine)" opacity=".3"/>`;
      const chairs = round
        ? [0, 90, 180, 270].map((a) => `<circle cx="${Math.cos(a * Math.PI / 180) * 58}" cy="${Math.sin(a * Math.PI / 180) * 58}" r="11" fill="none" stroke="#efe9df" stroke-width="1.5"/>`).join("")
        : [[-28, -50], [28, -50], [-28, 50], [28, 50]].map(([cx, cy]) => `<rect x="${cx - 12}" y="${cy - 9}" width="24" height="18" rx="4" fill="none" stroke="#efe9df" stroke-width="1.5"/>`).join("");
      return `<g transform="translate(${x} ${y})" data-t="${i}">
        <circle class="ft__light" r="95" fill="url(#glow)"/>
        ${chairs}${table}
        <text class="ft__num" y="5" text-anchor="middle">${i + 1}</text>
        <g transform="translate(0 -74)"><g class="ft__tag"><rect x="-56" y="-16" width="112" height="28" rx="14"/><text y="4" text-anchor="middle"></text></g></g>
      </g>`;
    }).join("");
  };
  const renderFloorTags = () => {
    $$("#floorTables > g").forEach((g, i) => { $(".ft__tag text", g).textContent = t(REASONS[i]); });
  };

  // ── Recetas
  const renderRecipes = () => {
    const chips = $("#recipeChips");
    chips.innerHTML = RECIPES.map((r) =>
      `<button role="tab" data-r="${r.id}" aria-selected="${r.id === state.recipe}">${t("rc." + r.id)}</button>`).join("");
    const r = RECIPES.find((x) => x.id === state.recipe);
    $("#recipeName").textContent = t("rc." + r.id);
    $("#recipeDesc").textContent = t("rc." + r.id + ".d");
    $("#recipeLamps").innerHTML = r.lights.map((on, i) => `<div class="rl ${on ? "on" : ""}"><i></i>${t("lights." + (i + 1))}</div>`).join("");
    $("#recipePlan").textContent = t("pl." + r.plan);
    const p = PRICES[state.cur][r.plan];
    $("#recipePrice").textContent = money(p) + (r.plan === "cadena" ? t("pr.per") : t("pr.mo"));
  };
  $("#recipeChips").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-r]");
    if (!b) return;
    state.recipe = b.dataset.r;
    renderRecipes();
    renderCalc();
  });

  // ── Precios
  const renderPlans = () => {
    const P = PRICES[state.cur];
    $("#trialBig").innerHTML = moneyBig(P.trial);
    $$("#curSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cur === state.cur)));
    $$("#billSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.bill === state.bill)));
    $("#plans").innerHTML = PLANS.map((id) => {
      const monthly = P[id];
      const shown = state.bill === "y" ? Math.round((monthly * 10) / 12) : monthly;
      const feats = t("pl." + id + ".f").map((f) => `<li>${f}</li>`).join("");
      const rec = id === "servicio";
      return `<article class="plan ${rec ? "rec" : ""}">
        ${rec ? `<span class="plan__badge">${t("pr.rec")}</span>` : ""}
        <h3>${t("pl." + id)}</h3>
        <div class="plan__price">${moneyBig(shown)}<small>${id === "cadena" ? t("pr.per") : t("pr.mo")}</small></div>
        <div class="plan__save">${state.bill === "y" ? t("pr.save", { amt: money(monthly * 10) }) : t("v.r3") + ": 0%"}</div>
        <ul>${feats}</ul>
        <a href="#empezar" class="btn ${rec ? "btn--red" : ""} btn--block">${t("pr.cta")}</a>
      </article>`;
    }).join("");
  };
  $("#curSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-cur]");
    if (!b) return;
    state.cur = b.dataset.cur;
    state.ticket = null;
    save("r87.cur", state.cur);
    applyI18n();
  });
  $("#billSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-bill]");
    if (!b) return;
    state.bill = b.dataset.bill;
    renderPlans();
  });

  // ── Calculadora
  const sl = { tables: $("#sTables"), turns: $("#sTurns"), nights: $("#sNights"), share: $("#sShare"), ticket: $("#sTicket") };
  const renderCalc = (resetTicket = false) => {
    const tk = PRICES[state.cur].ticket;
    if (resetTicket || state.ticket === null) {
      Object.assign(sl.ticket, { min: tk.min, max: tk.max, step: tk.step });
      sl.ticket.value = state.ticket ?? tk.def;
    }
    const v = Object.fromEntries(Object.entries(sl).map(([k, el]) => [k, Number(el.value)]));
    $("#oTables").textContent = v.tables;
    $("#oTurns").textContent = v.turns;
    $("#oNights").textContent = v.nights;
    $("#oShare").textContent = v.share + "%";
    $("#oTicket").textContent = money(v.ticket);
    const extra = v.tables * v.turns * v.nights * (v.share / 100) * v.ticket;
    const plan = RECIPES.find((r) => r.id === state.recipe).plan;
    const cost = PRICES[state.cur][plan];
    $("#calcExtra").innerHTML = moneyBig(Math.round(extra));
    $("#calcCostLbl").textContent = t("k.cost", { plan: t("pl." + plan) });
    $("#calcCost").textContent = money(cost) + t("pr.mo");
    const x = extra / cost;
    $("#calcX").textContent = (x >= 10 ? Math.round(x) : x.toFixed(1)) + "×";
  };
  Object.values(sl).forEach((el) => el.addEventListener("input", () => {
    if (el === sl.ticket) state.ticket = Number(el.value);
    renderCalc();
  }));

  // ── FAQ
  const renderFaq = () => {
    $("#faqList").innerHTML = t("faq").map(([q, a], i) =>
      `<details ${i === 0 ? "open" : ""}><summary>${q}</summary><p>${a}</p></details>`).join("");
  };

  // ── Formulario final
  const renderLeadTypes = () => {
    const sel = $("#leadType");
    const cur = sel.value || state.recipe;
    sel.innerHTML = RECIPES.map((r) => `<option value="${r.id}">${t("rc." + r.id)}</option>`).join("");
    sel.value = cur;
  };
  $("#leadForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const msg = t("e.msg", {
      name: String(f.get("name") || "").trim(),
      type: t("rc." + f.get("type")),
      city: String(f.get("city") || "").trim() || "—"
    });
    const num = CONFIG.whatsapp.replace(/\D/g, "");
    const url = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
  });

  // ── Demo en vivo
  const DEMO_ITEMS = [
    { key: "d.i1", ico: "🌮", price: { MXN: 95, USD: 6, EUR: 6 } },
    { key: "d.i2", ico: "🥘", price: { MXN: 120, USD: 8, EUR: 7 } },
    { key: "d.i3", ico: "🍺", price: { MXN: 85, USD: 6, EUR: 5 } }
  ];
  const demo = { call: null, since: 0, tickets: [], status: "d.s_idle", statusVars: {}, seq: 0 };
  const BUSY = [2, 4, 5, 8, 9];
  const setStatus = (key, vars = {}) => {
    demo.status = key; demo.statusVars = vars;
    const el = $("#clStatus");
    el.textContent = t(key, vars);
    el.classList.toggle("on", key !== "d.s_idle");
  };
  const renderDemo = () => {
    $("#clMenu").innerHTML = DEMO_ITEMS.map((it, i) => `<li><span class="ico" aria-hidden="true">${it.ico}</span>
      <div><b>${t(it.key)}</b><small>${money(it.price[state.cur])}</small></div>
      <button data-add="${i}">${t("d.add")}</button></li>`).join("");
    const floor = $("#staffFloor");
    floor.innerHTML = Array.from({ length: 10 }, (_, i) => {
      const n = i + 1;
      const lit = n === 7 && demo.call;
      return `<div class="tbl ${BUSY.includes(n) || n === 7 ? "busy" : ""} ${lit ? "lit" : ""}" data-n="${n}" ${lit ? `data-attend="${t("d.attend")}" role="button" tabindex="0"` : ""}>${n}${lit ? `<small>${t("d.r_" + demo.call)}</small>` : ""}</div>`;
    }).join("");
    renderKitchen();
    setStatus(demo.status, demo.statusVars.itemKey ? { item: t(demo.statusVars.itemKey), itemKey: demo.statusVars.itemKey } : demo.statusVars);
  };
  const mmss = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  };
  const renderKitchen = () => {
    const list = $("#kitchenList");
    $("#kitchenCount").textContent = demo.tickets.length;
    if (!demo.tickets.length) { list.innerHTML = `<li class="empty">${t("d.empty")}</li>`; return; }
    list.innerHTML = demo.tickets.map((tk) => `<li class="tk" data-id="${tk.id}">
      <b>${t("d.table")}</b><span>${t(tk.key)}</span><i data-since="${tk.t0}">${mmss(Date.now() - tk.t0)}</i>
      <button data-ready="${tk.id}">${t("d.ready")}</button></li>`).join("");
  };
  const addTicket = (key) => {
    demo.tickets.push({ id: ++demo.seq, key, t0: Date.now() });
    renderKitchen();
  };
  $("#clMenu").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-add]");
    if (!b) return;
    const it = DEMO_ITEMS[Number(b.dataset.add)];
    addTicket(it.key);
    setStatus("d.s_sent", { item: t(it.key), itemKey: it.key });
  });
  $(".cl__actions").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    demo.call = act;
    demo.since = Date.now();
    if (act === "round") addTicket("d.i3");
    setStatus("d.s_" + act);
    renderDemo();
  });
  const attend = () => {
    if (!demo.call) return;
    demo.call = null;
    setStatus("d.s_attended");
    renderDemo();
  };
  $("#staffFloor").addEventListener("click", (e) => { if (e.target.closest(".tbl.lit")) attend(); });
  $("#staffFloor").addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.closest(".tbl.lit")) { e.preventDefault(); attend(); } });
  $("#kitchenList").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-ready]");
    if (!b) return;
    const id = Number(b.dataset.ready);
    const tk = demo.tickets.find((x) => x.id === id);
    demo.tickets = demo.tickets.filter((x) => x.id !== id);
    renderKitchen();
    if (tk) setStatus("d.s_ready", { item: t(tk.key), itemKey: tk.key });
  });
  setInterval(() => {
    $$("#kitchenList i[data-since]").forEach((el) => { el.textContent = mmss(Date.now() - Number(el.dataset.since)); });
    const d = new Date();
    $("#staffClock").textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }, 1000);

  // ── Idioma
  $$(".lang button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.lang === state.lang) return;
    state.lang = b.dataset.lang;
    save("r87.lang", state.lang);
    if (!saved("r87.cur")) state.cur = DEFAULT_CUR[state.lang];
    state.ticket = null;
    applyI18n();
  }));

  // ── Apariciones (palabras y bloques)
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  const observeReveals = () => $$(".split, .reveal").forEach((el) => io.observe(el));

  // ── Cursor
  const cursor = $(".cursor");
  if (matchMedia("(pointer: fine)").matches && !reduceMotion) {
    let cx = innerWidth / 2, cy = innerHeight / 2;
    addEventListener("pointermove", (e) => { cx = e.clientX; cy = e.clientY; }, { passive: true });
    const loop = () => { cursor.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener("pointerover", (e) => {
      cursor.classList.toggle("is-big", !!e.target.closest("a, button, .tbl.lit, summary, input, select"));
    });
  }

  // ── Arranque
  buildFloor();
  applyI18n();
  observeReveals();

  const finishLoader = () => {
    document.body.classList.remove("is-loading");
    $(".loader").classList.add("is-done");
  };

  if (!window.gsap || !window.ScrollTrigger) {
    // Sin CDN: todo queda visible y funcional, sin escenas.
    finishLoader();
    $$(".ft__light, .ft__tag").forEach((el) => { el.style.opacity = 1; });
    $("#waitCount").textContent = "12";
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Scroll suave
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    window.rojo87 = { lenis };
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const target = id.length > 1 ? $(id) : document.body;
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }));
  // La delegación captura enlaces creados después (planes)
  document.addEventListener("click", (e) => {
    const a = e.target.closest('.plan a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const target = $(a.getAttribute("href"));
    if (lenis) lenis.scrollTo(target, { duration: 1.4 }); else target.scrollIntoView();
  });

  // Ocultar menú al bajar
  const nav = $(".nav");
  let lastY = 0;
  const onScroll = (y) => { nav.classList.toggle("is-hidden", y > lastY && y > 300); lastY = y; };
  if (lenis) lenis.on("scroll", ({ scroll }) => onScroll(scroll)); else addEventListener("scroll", () => onScroll(scrollY), { passive: true });

  // Cargador 00 → 87
  if (reduceMotion) finishLoader();
  else {
    const num = $("#loaderNum");
    const o = { v: 0 };
    gsap.timeline({ onComplete: finishLoader })
      .to(o, { v: 87, duration: 1.3, ease: "power2.inOut", onUpdate: () => { num.textContent = String(Math.round(o.v)).padStart(2, "0"); } })
      .to(".loader", { yPercent: -100, duration: 0.8, ease: "power4.inOut" }, "+=0.15")
      .from(".hero__art .layer", { scale: 0.85, opacity: 0, duration: 1.2, stagger: 0.12, ease: "power3.out", transformOrigin: "50% 50%" }, "-=0.4");
  }

  // Parallax del héroe
  if (matchMedia("(pointer: fine)").matches && !reduceMotion) {
    const layers = $$(".hero__art .layer").map((el, i) => ({
      x: gsap.quickTo(el, "x", { duration: 0.8, ease: "power3" }),
      y: gsap.quickTo(el, "y", { duration: 0.8, ease: "power3" }),
      k: (i + 1) * 10
    }));
    const glow = $(".hero__glow");
    const gx = gsap.quickTo(glow, "x", { duration: 1.2, ease: "power3" });
    const gy = gsap.quickTo(glow, "y", { duration: 1.2, ease: "power3" });
    $(".hero").addEventListener("pointermove", (e) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      layers.forEach((l) => { l.x(nx * l.k); l.y(ny * l.k); });
      gx(e.clientX); gy(e.clientY);
    });
  }
  gsap.to(".hero__art", { yPercent: 18, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  const mm = gsap.matchMedia();

  // Escena 1: el salón se prende
  const lights = LIGHT_ORDER.map((i) => $(`#floorTables > g[data-t="${i}"]`));
  const updateCount = () => {
    const n = lights.filter((g) => Number(gsap.getProperty($(".ft__light", g), "opacity")) > 0.5).length;
    $("#waitCount").textContent = n;
  };
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    gsap.set(".ft__tag", { y: 10 });
    const tl = gsap.timeline({
      onUpdate: updateCount,
      scrollTrigger: { trigger: ".problem__pin", start: "top top", end: "+=240%", pin: true, scrub: 0.6 }
    });
    lights.forEach((g, i) => {
      tl.to($(".ft__light", g), { opacity: 1, duration: 0.4 }, i * 0.35)
        .to($(".ft__tag", g), { opacity: 1, y: 0, duration: 0.4 }, i * 0.35);
    });
    tl.to(".problem__t1", { opacity: 0, y: -30, duration: 0.6 }, "+=0.4")
      .to(".problem__t2", { opacity: 1, y: 0, duration: 0.6 }, "<0.2");
    lights.forEach((g, i) => {
      tl.to([$(".ft__light", g), $(".ft__tag", g)], { opacity: 0, duration: 0.25 }, `>-${i ? 0.18 : 0}`);
    });
    tl.to({}, { duration: 0.6 });
  });
  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set(".ft__light, .ft__tag", { opacity: 1 });
    $("#waitCount").textContent = "12";
  });

  // Escena 2: cuatro momentos en horizontal
  mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
    const track = $(".moments__track");
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: { trigger: ".moments__pin", start: "top top", end: () => "+=" + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true }
    });
  });

  // Escena 3: la botella sirve otra ronda
  mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
    gsap.set("#bottle", { rotation: 0, svgOrigin: "470 210" });
    gsap.set("#stream", { scaleY: 0, transformOrigin: "50% 0%" });
    gsap.set(".pour__ticket", { opacity: 0, y: 30 });
    gsap.timeline({ scrollTrigger: { trigger: ".pour__pin", start: "top top", end: "+=160%", pin: true, scrub: 0.6 } })
      .to("#bottle", { rotation: -100, svgOrigin: "470 210", duration: 1, ease: "power2.inOut" })
      .to("#stream", { scaleY: 1, duration: 0.4, ease: "none" }, "-=0.2")
      .to("#liquid", { attr: { y: 560 }, duration: 1.2, ease: "none" })
      .to("#stream", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.3 })
      .to("#bottle", { rotation: 0, svgOrigin: "470 210", duration: 0.6 }, "<")
      .to(".pour__ticket", { opacity: 1, y: 0, duration: 0.4 });
  });
  mm.add("(max-width: 900px), (prefers-reduced-motion: reduce)", () => {
    gsap.set("#bottle", { rotation: -100, svgOrigin: "470 210" });
    gsap.set("#stream", { scaleY: 1, transformOrigin: "50% 0%" });
    gsap.set("#liquid", { attr: { y: 600 } });
  });

  // Escena 4: el chat de las 23:47
  mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
    gsap.set(".night .nb", { opacity: 0, y: 24 });
    gsap.set(".night__morning", { opacity: 0, y: 20 });
    gsap.timeline({ scrollTrigger: { trigger: ".night__pin", start: "top top", end: "+=200%", pin: true, scrub: 0.6 } })
      .to(".night .nb", { opacity: 1, y: 0, stagger: 0.8, duration: 0.5 })
      .to(".night__morning", { opacity: 1, y: 0, duration: 0.5 }, "+=0.4")
      .to({}, { duration: 0.6 });
  });
  mm.add("(max-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
    gsap.from(".night .nb", { opacity: 0, y: 24, stagger: 0.3, duration: 0.6, scrollTrigger: { trigger: ".night__chat", start: "top 75%" } });
  });

  addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
