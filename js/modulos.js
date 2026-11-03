// ====== Módulos con micrófono (sin reconocimiento de voz) ======
const mediana = a => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const percentil = (a, p) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.max(0, Math.round(p * (b.length - 1))))]; };
const promedio = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const semitonos = (f, ref) => 12 * Math.log2(f / ref);
const NOTAS = ["Do", "Do♯", "Re", "Re♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"];
const nombreNota = f => { const m = Math.round(69 + 12 * Math.log2(f / 440)); return NOTAS[(m % 12 + 12) % 12] + (Math.floor(m / 12) - 1); };

// Sesión de micrófono con detección de voz por umbral sobre el ruido de fondo.
// op: { grabar, conTono, maxSeg, silencioFin, alFrame(fr), alFin(res) }
// fr = { t, db, f0, voz }
async function sesionMic(op) {
  const M = new Medidor();
  await M.start({ grabar: !!op.grabar });
  const frames = [], piso = []; let umbral = null, empezo = false, ultimaVoz = 0, parar = null, terminado = false;
  const fin = async () => {
    if (terminado) return; terminado = true; parar && parar();
    const r = await M.stop();
    op.alFin && op.alFin({ frames, umbral, audio: r.audio, secs: r.secs });
  };
  parar = bucle(() => {
    const t = M.segundos(), db = M.db();
    if (umbral == null) {
      piso.push(db);
      if (t >= 0.6) { umbral = Math.max(mediana(piso) + 8, -58); op.alListo && op.alListo(); }
      return;
    }
    const voz = db > umbral;
    const f0 = op.conTono && voz ? M.tono() : null;
    const fr = { t, db, f0: f0 && f0 > 60 && f0 < 1000 ? f0 : null, voz };
    frames.push(fr);
    if (voz) { empezo = true; ultimaVoz = t; }
    op.alFrame && op.alFrame(fr, M);
    if ((op.maxSeg && t > op.maxSeg) || (empezo && op.silencioFin && t - ultimaVoz > op.silencioFin)) fin();
  });
  return { M, terminar: fin, cancelar: () => { terminado = true; parar && parar(); M.stop(); } };
}

// Voz normal de referencia: mediana de dB y de tono de los cuadros con voz.
function referenciaDeVoz(frames) {
  const v = frames.filter(f => f.voz);
  if (v.length < 20) return null;
  const f0 = mediana(v.map(f => f.f0).filter(Boolean));
  return { db: +mediana(v.map(f => f.db)).toFixed(1), f0: f0 ? Math.round(f0) : null, fecha: today() };
}

// Tarjeta de calibración reutilizable (también la usa el diagnóstico).
function calibrarHTML() {
  return `<p>Di con tu voz <b>normal de conversación</b>, como si platicaras a un metro de distancia:</p>
    <div class="target">«Buenos días. Hoy empiezo a entrenar mi voz con calma y constancia.»</div>
    <div class="meter"><div data-id="cal-lv"></div></div><p class="sub" data-id="cal-st">Toca el botón, guarda silencio un instante y lee la frase.</p>`;
}
async function correrCalibracion(cont, alTerminar) {
  const st = cont.querySelector('[data-id="cal-st"]'), lv = cont.querySelector('[data-id="cal-lv"]');
  let ses;
  try {
    ses = await sesionMic({
      conTono: true, maxSeg: 9, silencioFin: 1.4,
      alListo: () => { st.textContent = "Ahora lee la frase…"; },
      alFrame: fr => { lv.style.width = Math.max(0, Math.min(1, (fr.db + 60) / 55)) * 100 + "%"; },
      alFin: r => {
        const ref = referenciaDeVoz(r.frames);
        if (!ref) { st.textContent = "No alcancé a escucharte. Intenta otra vez un poco más cerca."; alTerminar(null); return; }
        S.volBase = ref; save();
        st.textContent = `Listo: tu voz normal quedó registrada${ref.f0 ? ` (tono cercano a ${nombreNota(ref.f0)})` : ""}.`;
        alTerminar(ref);
      }
    });
  } catch (_) { alTerminar(null); }
  return ses;
}

function dibujarCurva(canvas, series, opciones = {}) {
  const dpr = devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight || 120;
  canvas.width = W * dpr; canvas.height = H * dpr; const x = canvas.getContext("2d"); x.scale(dpr, dpr); x.clearRect(0, 0, W, H);
  const pts = series.filter(p => p.y != null); if (pts.length < 2) return;
  const t0 = opciones.t0 ?? pts[0].x, t1 = opciones.t1 ?? pts[pts.length - 1].x;
  const y0 = opciones.min ?? Math.min(...pts.map(p => p.y)), y1 = opciones.max ?? Math.max(...pts.map(p => p.y));
  const X = t => 8 + (t - t0) / (t1 - t0 || 1) * (W - 16), Y = v => H - 8 - (v - y0) / (y1 - y0 || 1) * (H - 16);
  if (opciones.banda) { const [a, b] = opciones.banda; x.fillStyle = "#1f9d5526"; x.fillRect(0, Y(b), W, Y(a) - Y(b)); }
  x.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--acc").trim() || "#2f7de1"; x.lineWidth = 2.5; x.lineJoin = "round";
  x.beginPath(); let antes = null;
  for (const p of pts) { if (antes && p.x - antes.x > 0.15) x.moveTo(X(p.x), Y(p.y)); else if (!antes) x.moveTo(X(p.x), Y(p.y)); else x.lineTo(X(p.x), Y(p.y)); antes = p; }
  x.stroke();
}

Object.assign(VIEWS, {
  // ===== Proyección y volumen =====
  vol() {
    const base = S.volBase;
    $("#app").innerHTML = `<div class="card"><h2>📣 Proyección y volumen</h2>
      <p>Proyectar es llegar al fondo de la sala <b>sin gritar</b>. La meta: <b>+6 dB sobre tu voz normal, sostenidos 5 segundos</b>, sin pasar el límite.</p>
      <p class="sub">Los dB son relativos a tu propia voz en este micrófono, no decibeles de sonómetro. Mantén el teléfono a la misma distancia (unos 50 cm).</p></div>
      <div class="card" id="cal"><h3>1. Tu voz normal</h3>${calibrarHTML()}<button class="btn sec" id="calb">Registrar mi voz normal</button></div>
      <div class="card" id="ej"><h3>${base ? "" : "2. "}Proyecta</h3>
        <div class="target" id="fr">«¡Buenos días a todos! Gracias por estar aquí.»</div>
        <div class="vol-num" id="num" aria-live="off">—</div>
        <div class="vol-bar" aria-hidden="true"><div class="z-meta"></div><div class="z-lim"></div><div class="vol-ind" id="ind"></div></div>
        <div class="vol-leyenda"><span>normal</span><span>meta +6</span><span>límite +12</span></div>
        <div class="timer" id="sost">0.0 s</div><p class="sub" id="msg" style="text-align:center">${base ? "Toca empezar y proyecta la frase (o una «a» sostenida)." : "Primero registra tu voz normal."}</p>
        <button class="btn" id="go" ${base ? "" : "disabled"}>Empezar</button>
        ${base ? `<button class="btn sec" id="recal">Volver a registrar mi voz normal</button>` : ""}</div>`;
    if (base) $("#cal").classList.add("hidden");
    const frases = ["«¡Buenos días a todos! Gracias por estar aquí.»", "Una «aaaa» sostenida, abierta y firme.", "Cuenta del uno al diez, proyectando cada número.", "«Señoría, con su venia, solicito la palabra.»"];
    let ses = null, mejor = 0, racha = 0, prev = null, suave = null, sobre = 0, rels = [];
    const pintar = rel => {
      $("#num").textContent = rel == null ? "—" : (rel >= 0 ? "+" : "") + rel.toFixed(1) + " dB";
      const pos = rel == null ? 0 : Math.max(0, Math.min(1, (rel + 6) / 24));
      $("#ind").style.left = pos * 100 + "%";
      $("#num").className = "vol-num " + (rel == null ? "" : rel >= 12 ? "lim" : rel >= 6 ? "ok" : "");
    };
    const terminar = () => ses && ses.terminar();
    if ($("#calb")) $("#calb").onclick = async () => { $("#calb").disabled = true; ses = await correrCalibracion($("#cal"), ref => { ses = null; $("#calb").disabled = false; if (ref) setTimeout(() => go("vol"), 900); }); };
    if ($("#recal")) $("#recal").onclick = () => { delete S.volBase; save(); go("vol"); };
    $("#go").onclick = async () => {
      if (ses) return terminar();
      mejor = 0; racha = 0; prev = null; suave = null; sobre = 0; rels = []; $("#fr").textContent = pick(frases);
      $("#go").textContent = "Terminar"; $("#go").className = "btn rec"; $("#msg").textContent = "Silencio un instante…";
      try {
        ses = await sesionMic({
          maxSeg: 20, silencioFin: 2.5,
          alListo: () => { $("#msg").textContent = "¡Ahora! Proyecta hacia el fondo de la sala."; },
          alFrame: fr => {
            const dt = prev == null ? 0 : fr.t - prev; prev = fr.t;
            if (!fr.voz) { suave = null; racha = Math.max(0, racha - dt); pintar(null); return; }
            suave = suave == null ? fr.db : suave * 0.7 + fr.db * 0.3;
            const rel = suave - S.volBase.db; rels.push(rel); pintar(rel);
            const limite = rel >= 12 || fr.db > -3;
            if (limite) { sobre += dt; racha = 0; $("#msg").textContent = "Un poco menos: proyecta sin gritar."; }
            else if (rel >= 6) { racha += dt; mejor = Math.max(mejor, racha); $("#msg").textContent = racha >= 5 ? "¡Meta lograda! Así se proyecta." : "¡Eso! Sostén…"; }
            else { racha = 0; $("#msg").textContent = "Más aire y más intención, sin apretar la garganta."; }
            $("#sost").textContent = racha.toFixed(1) + " s";
          },
          alFin: () => {
            ses = null; $("#go").textContent = "Otra vez"; $("#go").className = "btn";
            if (!rels.length) { $("#msg").textContent = "No te escuché. Acércate un poco."; return; }
            const prom = +mediana(rels).toFixed(1), meta = mejor >= 5;
            logSession("vol", { mejor: +mejor.toFixed(1), rel: prom, meta, sobre: +sobre.toFixed(1) });
            if (meta && !S.badges.vol) { S.badges.vol = today(); save(); toast("📣 ¡Logro desbloqueado! Voz que llega"); }
            $("#msg").innerHTML = `Mejor tramo en la meta: <b>${mejor.toFixed(1)} s</b> · volumen típico: <b>${prom >= 0 ? "+" : ""}${prom} dB</b>. ${meta ? "🎯 ¡Meta cumplida!" : "Cada intento suma: respira desde el abdomen y vuelve a intentarlo."}`;
          }
        });
      } catch (_) { ses = null; $("#go").textContent = "Empezar"; $("#go").className = "btn"; }
    };
    cleanup = () => { ses && ses.cancelar(); };
  },

  // ===== Entonación: misma frase, tres intenciones =====
  ento(arg) {
    const F = arg && arg.base ? arg : pick(ENTONACION);
    const marcar = t => esc(t).replace(new RegExp(`(^|\\s)(${F.enfasis})(?=\\s|$)`, "i"), (m, a, w) => `${a}<b class="enf">${w.toUpperCase()}</b>`);
    const INT = [
      { id: "afirmar", n: "Afirmar", txt: F.base + ".", html: esc(F.base) + ".", guia: "Con seguridad: el tono <b>baja</b> al final." },
      { id: "preguntar", n: "Preguntar", txt: "¿" + F.base + "?", html: "¿" + esc(F.base) + "?", guia: "Pregunta de sí o no: el tono <b>sube</b> al final." },
      { id: "enfatizar", n: "Enfatizar", txt: F.base + ".", html: marcar(F.base) + ".", guia: "Destaca la palabra en mayúsculas: <b>más alto y con más fuerza</b> en ella." }
    ];
    $("#app").innerHTML = `<div class="card"><h2>🎭 Entonación</h2><p>Lee la misma frase con tres intenciones. Solo uso el micrófono para medir tu tono; nada sale del teléfono.</p></div>
      ${INT.map((it, i) => `<div class="card" data-int="${it.id}"><h3>${i + 1}. ${it.n}</h3><div class="target">${it.html}</div><p class="sub">${it.guia}</p>
        <canvas class="curva" height="110" aria-hidden="true"></canvas><p class="res" aria-live="polite"></p><button class="btn ${i ? "sec" : ""}">🎙️ Grabar</button><div class="aud"></div></div>`).join("")}
      <div class="card" id="tot"></div><button class="btn sec" id="otra">🔀 Otra frase</button>`;
    $("#otra").onclick = () => go("ento", pick(ENTONACION.filter(x => x !== F)));
    const res = {}; let ses = null;
    INT.forEach(it => {
      const c = document.querySelector(`[data-int="${it.id}"]`), b = c.querySelector("button"), cv = c.querySelector("canvas"), out = c.querySelector(".res");
      b.onclick = async () => {
        if (ses) { if (b.dataset.activo) ses.terminar(); return; }
        b.dataset.activo = "1"; b.textContent = "⏹️ Terminar"; b.className = "btn rec"; out.textContent = "Silencio un instante…";
        try {
          ses = await sesionMic({
            grabar: true, conTono: true, maxSeg: 8, silencioFin: 1.1,
            alListo: () => { out.textContent = "Ahora, lee la frase."; },
            alFin: r => {
              ses = null; delete b.dataset.activo; b.textContent = "🔁 Repetir"; b.className = "btn sec";
              const a = analizarEntonacion(r.frames, it.id);
              c.querySelector(".aud").innerHTML = r.audio ? `<audio controls src="${r.audio}" style="width:100%"></audio>` : "";
              if (!a) { out.textContent = "No alcancé a detectar tu tono. Habla un poco más fuerte y cerca."; return; }
              dibujarCurva(cv, a.curva, { min: -8, max: 8 });
              res[it.id] = a.ok; out.innerHTML = (a.ok ? "✅ " : "💡 ") + a.msg;
              const n = Object.keys(res).length;
              if (n === 3) {
                const ac = Object.values(res).filter(Boolean).length;
                logSession("ento", { aciertos: ac, fid: F.id });
                if (ac === 3 && !S.badges.ento) { S.badges.ento = today(); save(); toast("🎭 ¡Logro desbloqueado! Tres intenciones"); }
                $("#tot").innerHTML = `<h3>Resultado: ${ac} de 3 intenciones claras</h3><p>${ac === 3 ? "Excelente control del tono. Prueba otra frase." : "Escucha tus grabaciones y exagera un poco más la diferencia entre las tres."}</p>`;
              }
            }
          });
        } catch (_) { ses = null; delete b.dataset.activo; b.textContent = "🎙️ Grabar"; b.className = "btn"; }
      };
    });
    cleanup = () => ses && ses.cancelar();
  },

  // ===== Pausas antes de ideas clave =====
  pausa(arg) {
    const pool = LECTURAS.filter(l => l.pausas >= 2), L = arg && arg.texto ? arg : pick(pool);
    const partes = L.texto.split(" / "), cortes = []; let acc = 0;
    partes.forEach((p, i) => { acc += palabras(p).length; if (i < partes.length - 1) cortes.push(acc); });
    const N = acc;
    $("#app").innerHTML = `<div class="card"><h2>⏸️ Pausas</h2><p>Lee el texto en voz alta. Haz una pausa de <b>medio segundo a un segundo y medio</b> en cada <b class="pz">‖</b>: justo antes de la idea clave. Cada pausa en su lugar suma.</p>
      <h3>${esc(L.titulo)}</h3><div class="target" id="tg">${partes.map((p, i) => esc(p) + (i < partes.length - 1 ? ` <span class="pz" data-p="${i}">‖</span> ` : "")).join("")}</div>
      <div class="meter"><div id="lv"></div></div><p class="sub" id="msg">Toca empezar, guarda silencio un instante y lee.</p>
      <button class="btn" id="go">Empezar</button><div id="res"></div><button class="btn sec" id="otra">🔀 Otro texto</button></div>`;
    $("#otra").onclick = () => go("pausa", pick(pool.filter(x => x !== L)));
    let ses = null;
    $("#go").onclick = async () => {
      if (ses) return ses.terminar();
      $("#go").textContent = "Terminé"; $("#go").className = "btn rec"; $("#res").innerHTML = "";
      document.querySelectorAll("#tg .pz").forEach(s => s.className = "pz");
      try {
        ses = await sesionMic({
          grabar: true, maxSeg: 120, silencioFin: 3,
          alListo: () => { $("#msg").textContent = "Adelante, lee el texto."; },
          alFrame: fr => { $("#lv").style.width = Math.max(0, Math.min(1, (fr.db + 60) / 55)) * 100 + "%"; },
          alFin: r => {
            ses = null; $("#go").textContent = "Otra vez"; $("#go").className = "btn";
            const a = analizarPausas(r.frames, cortes, N);
            if (!a) { $("#msg").textContent = "No alcancé a escucharte. Intenta un poco más cerca."; return; }
            a.aciertos.forEach((ok, i) => { const s = document.querySelector(`#tg .pz[data-p="${i}"]`); if (s) s.className = "pz " + (ok ? "pz-ok" : "pz-no"); });
            const hit = a.aciertos.filter(Boolean).length;
            logSession("pausa", { hit, total: cortes.length, pausas: a.pausas.length, lid: L.id });
            if (hit === cortes.length && !S.badges.pausa) { S.badges.pausa = today(); save(); toast("⏸️ ¡Logro desbloqueado! El poder del silencio"); }
            $("#msg").textContent = "";
            $("#res").innerHTML = `<div class="stats" style="margin-top:12px"><div class="stat"><b>${hit}/${cortes.length}</b><span>pausas clave</span></div><div class="stat"><b>${a.pausas.length}</b><span>pausas totales</span></div><div class="stat"><b>${a.durMedia ? a.durMedia.toFixed(1) + "s" : "—"}</b><span>duración media</span></div></div>
              <p>${hit === cortes.length ? "✨ Todas las ideas clave tuvieron su silencio. Así se escucha la seguridad." : hit ? `✨ ${hit} pausa${hit > 1 ? "s" : ""} en su lugar. Las marcas en verde son tus aciertos; en la siguiente, busca las demás.` : "Esta vez no detecté pausas en las marcas. Respira justo antes de cada ‖ y cuenta «uno» en silencio."}</p>
              <p class="sub">La ubicación se estima por el tiempo de habla; respirar en otros lugares no resta.</p>
              ${r.audio ? `<h3>Escúchate</h3><audio controls src="${r.audio}" style="width:100%"></audio>` : ""}`;
          }
        });
      } catch (_) { ses = null; $("#go").textContent = "Empezar"; $("#go").className = "btn"; }
    };
    cleanup = () => ses && ses.cancelar();
  },

  // ===== Calentamiento de canto: resonancia, sirenas y escalas =====
  voc(arg) {
    const sec = arg || "res";
    const tabs = [["res", "Resonancia"], ["sir", "Sirenas"], ["esc", "Escalas"]];
    $("#app").innerHTML = `<div class="card"><h2>🎵 Calentamiento de canto</h2><p>Calienta las cuerdas vocales y la resonancia antes de hablar. Solo uso el micrófono; nada sale del teléfono. Con audífonos oyes mejor las notas de referencia.</p>
      <div class="seg" role="tablist">${tabs.map(([id, n]) => `<button role="tab" aria-selected="${id === sec}" class="${id === sec ? "on" : ""}" onclick="go('voc','${id}')">${n}</button>`).join("")}</div></div><div id="vsec"></div>`;
    ({ res: canto_resonancia, sir: canto_sirenas, esc: canto_escalas })[sec]($("#vsec"));
  }
});

function analizarEntonacion(frames, intencion) {
  const v = frames.filter(f => f.voz && f.f0);
  if (v.length < 12) return null;
  const ref = mediana(v.map(f => f.f0));
  let st = v.map(f => semitonos(f.f0, ref));
  st = st.map((_, i) => mediana(st.slice(Math.max(0, i - 2), i + 3))); // suaviza saltos de octava
  const n = st.length, tramo = (a, b) => promedio(st.slice(Math.floor(a * n), Math.max(Math.floor(a * n) + 1, Math.floor(b * n))));
  const final = tramo(0.85, 1), medio = tramo(0.4, 0.7), delta = final - medio;
  const curva = v.map((f, i) => ({ x: f.t, y: st[i] }));
  const dbs = v.map(f => f.db), alto = percentil(st, 0.95), fuerza = percentil(dbs, 0.95) - mediana(dbs);
  if (intencion === "afirmar") {
    const ok = delta <= -1;
    return { ok, curva, msg: ok ? `El tono bajó ${Math.abs(delta).toFixed(1)} semitonos al final: suena a afirmación.` : "Al final el tono no bajó. Termina la frase hacia abajo, como quien pone punto final." };
  }
  if (intencion === "preguntar") {
    const ok = delta >= 1.5;
    return { ok, curva, msg: ok ? `El tono subió ${delta.toFixed(1)} semitonos al final: se entiende como pregunta.` : "Al final el tono no subió lo suficiente. Eleva la última sílaba, como si esperaras respuesta." };
  }
  const ok = alto >= 3 || fuerza >= 6;
  return { ok, curva, msg: ok ? `Hubo un realce claro (${alto.toFixed(1)} semitonos sobre tu tono medio): el énfasis se nota.` : "El énfasis fue suave. Sube el tono y la fuerza solo en la palabra destacada." };
}

// Estima en qué palabra cayó cada pausa usando el tiempo de habla acumulado.
function analizarPausas(frames, cortes, N) {
  if (frames.length < 30) return null;
  const segs = []; let ini = null, ult = null;
  for (const f of frames) {
    if (f.voz) { if (ini == null) ini = f.t; ult = f.t; }
    else if (ini != null && f.t - ult > 0.12) { segs.push([ini, ult]); ini = null; }
  }
  if (ini != null) segs.push([ini, ult]);
  // une microcortes (< 0.25 s) que son parte de la misma frase
  const voz = [];
  for (const s of segs) { const p = voz[voz.length - 1]; if (p && s[0] - p[1] < 0.25) p[1] = s[1]; else voz.push(s.slice()); }
  if (!voz.length) return null;
  const habla = voz.reduce((x, s) => x + (s[1] - s[0]), 0);
  if (habla < 2) return null;
  const pausas = []; let acum = 0;
  for (let i = 0; i < voz.length - 1; i++) {
    acum += voz[i][1] - voz[i][0];
    const dur = voz[i + 1][0] - voz[i][1];
    if (dur >= 0.3) pausas.push({ palabra: acum / habla * N, dur });
  }
  const tol = Math.max(2, N * 0.08);
  const aciertos = cortes.map(c => pausas.some(p => Math.abs(p.palabra - c) <= tol && p.dur >= 0.35));
  return { pausas, aciertos, durMedia: promedio(pausas.map(p => p.dur)) };
}

function canto_resonancia(el) {
  const seq = ["Humming «mmm» con labios cerrados: siente vibrar la nariz y los labios.", "«Mmm-ma, mmm-me, mmm-mi»: lleva la vibración del humming a la vocal.", "Labios en trompetilla «brrr» deslizando el tono (relaja labios y garganta).",
    "«Ng» (como en «tengo») sostenido: siente la vibración detrás de la nariz.", "«Mi-me-ma-mo-mu» subiendo un poco el tono en cada vocal.", "Bostezo-suspiro: abre la garganta y suelta «aaah» relajado de agudo a grave."];
  el.innerHTML = `<div class="card"><h3>Resonancia guiada · 2 min</h3><div class="target" id="v">${seq[0]}</div><div class="timer" id="tm">20</div><div class="meter"><div id="lv"></div></div>
    <button class="btn" id="go">Iniciar</button></div>`;
  let M = null, stopM = null, stopT = null;
  $("#go").onclick = async () => {
    $("#go").disabled = true; let i = 0;
    M = new Medidor();
    try { await M.start(); stopM = bucle(() => { $("#lv").style.width = (M.nivel() * 100) + "%"; }); } catch (_) { M = null; }
    const paso = () => {
      $("#v").textContent = seq[i];
      stopT = cuentaRegresiva(20, r => { $("#tm").textContent = r; }, () => {
        i++; if (i < seq.length) return paso();
        stopM && stopM(); M && M.stop(); M = null;
        $("#v").textContent = "¡Voz caliente! 🔥"; $("#tm").textContent = "✓"; $("#go").disabled = false; logSession("voc", { modo: "resonancia" });
      });
    };
    paso();
  };
  cleanup = () => { stopT && stopT(); stopM && stopM(); M && M.stop(); M = null; };
}

function canto_sirenas(el) {
  el.innerHTML = `<div class="card"><h3>Sirenas</h3><p>Con «uuu» o con labios en «brrr», desliza la voz de tu nota más grave a la más aguda y de regreso, <b>sin forzar</b>. Haz 3 sirenas seguidas.</p>
    <canvas class="curva grande" height="160" id="cv" aria-hidden="true"></canvas><div class="stats"><div class="stat"><b id="rg">—</b><span>rango (semitonos)</span></div><div class="stat"><b id="lo">—</b><span>nota grave</span></div><div class="stat"><b id="hi">—</b><span>nota aguda</span></div></div>
    <button class="btn" id="go">Empezar sirenas (15 s)</button><p class="sub" id="msg"></p></div>`;
  let ses = null;
  $("#go").onclick = async () => {
    if (ses) return ses.terminar();
    const pts = [], fs = []; $("#go").textContent = "Terminar"; $("#go").className = "btn rec";
    try {
      ses = await sesionMic({
        conTono: true, maxSeg: 15.6,
        alListo: () => { $("#msg").textContent = "¡Ahora! Grave → agudo → grave."; },
        alFrame: fr => {
          if (!fr.f0) return;
          fs.push(fr.f0); pts.push({ x: fr.t, y: 12 * Math.log2(fr.f0 / 55) });
          if (pts.length % 4 === 0) dibujarCurva($("#cv"), pts, { t0: 0.6, t1: 15.6, min: 0, max: 48 });
        },
        alFin: () => {
          ses = null; $("#go").textContent = "Otra vez"; $("#go").className = "btn";
          if (fs.length < 20) { $("#msg").textContent = "No detecté tu tono. Prueba con «uuu» un poco más fuerte."; return; }
          const lo = percentil(fs, 0.05), hi = percentil(fs, 0.95), rango = Math.round(semitonos(hi, lo));
          $("#rg").textContent = rango; $("#lo").textContent = nombreNota(lo); $("#hi").textContent = nombreNota(hi);
          $("#msg").textContent = rango >= 12 ? "¡Más de una octava! Voz flexible y despierta." : "Buen calentamiento. Con la práctica el rango se abre solo; nunca fuerces.";
          logSession("voc", { modo: "sirena", rango });
        }
      });
    } catch (_) { ses = null; $("#go").textContent = "Empezar sirenas (15 s)"; $("#go").className = "btn"; }
  };
  cleanup = () => ses && ses.cancelar();
}

function canto_escalas(el) {
  const baseHz = (S.volBase && S.volBase.f0) || null;
  const raiz = baseHz ? 440 * Math.pow(2, Math.round(12 * Math.log2(baseHz / 440)) / 12) : null;
  const PASOS = [0, 2, 4, 5, 7, 5, 4, 2, 0];
  el.innerHTML = `<div class="card"><h3>Escala de cinco notas</h3>
    ${raiz ? `<p>Escucha cada nota y cántala con «ma». Empezamos en <b>${nombreNota(raiz)}</b>, cerca de tu tono de voz.</p>` : `<p>Primero registro tu tono de voz para elegir una escala cómoda.</p>`}
    <div class="notas" id="nt">${PASOS.map((p, i) => `<span data-i="${i}">${raiz ? nombreNota(raiz * Math.pow(2, p / 12)).replace(/\d+$/, "") : "·"}</span>`).join("")}</div>
    <div class="afina" aria-hidden="true"><div id="aguja"></div></div><p class="sub" id="msg" style="text-align:center">${raiz ? "Toca empezar." : ""}</p>
    ${raiz ? `<button class="btn" id="go">Empezar escala</button><button class="btn sec" id="recal">Cambiar mi tono base</button>` : `<div id="cal">${calibrarHTML()}</div><button class="btn" id="calb">Registrar mi tono</button>`}</div>`;
  let ses = null, vivo = true;
  if ($("#calb")) $("#calb").onclick = async () => { $("#calb").disabled = true; ses = await correrCalibracion($("#cal"), ref => { ses = null; $("#calb").disabled = false; if (ref && ref.f0) setTimeout(() => vivo && go("voc", "esc"), 900); else if (ref) $("#msg").textContent = "No detecté tu tono. Intenta con voz un poco más sostenida."; }); };
  if ($("#recal")) $("#recal").onclick = () => { if (S.volBase) delete S.volBase.f0; save(); go("voc", "esc"); };
  if (!raiz) { cleanup = () => { vivo = false; ses && ses.cancelar(); }; return; }
  $("#go").onclick = async () => {
    $("#go").disabled = true; const aciertos = [];
    let i = 0, objetivo = 0, fase = "", tFase = 0, buenos = 0, prevT = 0;
    const sigNota = () => {
      if (i >= PASOS.length) return ses && ses.terminar();
      objetivo = raiz * Math.pow(2, PASOS[i] / 12); buenos = 0; fase = "oye"; tFase = ses ? ses.M.segundos() : 0;
      document.querySelectorAll("#nt span").forEach(s => s.classList.toggle("act", +s.dataset.i === i));
      $("#msg").textContent = "Escucha…"; ses && tocarNota(ses.M, objetivo, 0.8);
    };
    try {
      ses = await sesionMic({
        conTono: true, maxSeg: 40,
        alListo: () => sigNota(),
        alFrame: (fr, M) => {
          const t = fr.t, dt = t - prevT; prevT = t;
          if (fase === "oye") { if (t - tFase > 1.0) { fase = "canta"; tFase = t; $("#msg").textContent = "¡Canta!"; } return; }
          if (fase !== "canta") return;
          if (fr.f0) {
            let c = 1200 * Math.log2(fr.f0 / objetivo); c = ((c + 600) % 1200 + 1200) % 1200 - 600; // ignora saltos de octava
            $("#aguja").style.left = 50 + Math.max(-50, Math.min(50, c / 2)) + "%";
            if (Math.abs(c) <= 50) buenos += dt;
          }
          if (buenos >= 0.4 || t - tFase > 2.2) {
            const ok = buenos >= 0.4; aciertos.push(ok);
            const s = document.querySelector(`#nt span[data-i="${i}"]`); if (s) s.classList.add(ok ? "ok" : "no");
            i++; fase = ""; setTimeout(() => vivo && ses && sigNota(), 250);
          }
        },
        alFin: () => {
          ses = null; if (!vivo) return; $("#go").disabled = false; $("#go").textContent = "Otra vez";
          const ac = aciertos.filter(Boolean).length;
          $("#msg").textContent = `${ac} de ${PASOS.length} notas afinadas. ${ac >= 7 ? "¡Muy buen oído!" : "Escucha bien la nota antes de cantar; con calma mejora rápido."}`;
          if (aciertos.length) logSession("voc", { modo: "escala", aciertos: ac, total: PASOS.length });
          if (ac >= 8 && !S.badges.canto) { S.badges.canto = today(); save(); toast("🎶 ¡Logro desbloqueado! Afinado"); }
        }
      });
    } catch (_) { ses = null; $("#go").disabled = false; }
  };
  cleanup = () => { vivo = false; ses && ses.cancelar(); };
}

// Nota de referencia con el mismo contexto de audio del medidor.
function tocarNota(M, f, dur) {
  if (!M.ctx) return;
  const o = M.ctx.createOscillator(), g = M.ctx.createGain(), t = M.ctx.currentTime;
  o.type = "triangle"; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.05); g.gain.setValueAtTime(0.25, t + dur - 0.1); g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); g.connect(M.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
