// ====== Diagnóstico inicial (~3 min): voz normal, lectura, trabalenguas e improvisación ======
// Fija la línea base y elige automáticamente los sonidos a trabajar.

const DIAG_PASOS = ["Tu voz", "Lectura", "Trabalenguas", "Improvisación"];

function diagMarco(paso, titulo, cuerpo) {
  return `<section class="diag" aria-labelledby="dg-t">
    <div class="diag-prog" role="progressbar" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${Math.min(paso, 4)}" aria-label="${paso > 4 ? "Diagnóstico completo" : `Paso ${paso} de 4`}">
      ${DIAG_PASOS.map((n, i) => `<span class="${i < paso - 1 ? "hecho" : i === paso - 1 ? "act" : ""}"></span>`).join("")}</div>
    <p class="diag-paso">${paso > 4 ? "Resultado del diagnóstico" : paso ? `Paso ${paso} de 4 · ${DIAG_PASOS[paso - 1]}` : "Diagnóstico · 3 minutos"}</p>
    <h2 id="dg-t" class="diag-titulo">${titulo}</h2>${cuerpo}</section>`;
}

VIEWS.diag = function () {
  const D = { fon: {}, modo: srEstado() === "ok" ? "medido" : "auto" };
  let ses = null, rec = null, vivo = true, parar = null;
  cleanup = () => { vivo = false; ses && ses.cancelar(); rec && rec.abort(); parar && parar(); };
  const app = $("#app");

  // --- 0. Introducción
  app.innerHTML = `<div class="card">${diagMarco(0, "Encontremos tu punto de partida", `
    <p class="diag-lead">Cuatro pruebas cortas para medir cómo hablas hoy. Con eso fijo tu <b>línea base</b> y elijo los sonidos que más te conviene entrenar.</p>
    <ol class="diag-lista"><li><b>Tu voz normal</b> · 10 s</li><li><b>Lectura en voz alta</b> · 30 s</li><li><b>Trabalenguas cortos</b> · 90 s</li><li><b>Improvisación</b> · 45 s</li></ol>
    <p class="sub">Busca un lugar tranquilo y deja el teléfono a unos 50 cm.${D.modo === "auto" ? " Aquí no hay medición automática: en las pruebas de dicción te pediré calificarte." : ""}</p>
    <button class="btn" id="d-go">Empezar diagnóstico</button>`)}</div>`;
  $("#d-go").onclick = paso1;

  // --- 1. Voz normal (solo micrófono)
  function paso1() {
    app.innerHTML = `<div class="card">${diagMarco(1, "Tu voz normal", `<div id="cal">${calibrarHTML()}</div><button class="btn" id="d-b">Grabar mi voz normal</button>`)}</div>`;
    $("#d-b").onclick = async () => {
      $("#d-b").disabled = true;
      ses = await correrCalibracion($("#cal"), ref => {
        ses = null; if (!vivo) return;
        if (!ref) { $("#d-b").disabled = false; $("#d-b").textContent = "Intentar de nuevo"; return; }
        D.db = ref.db; D.f0 = ref.f0; setTimeout(() => vivo && paso2(), 900);
      });
    };
  }

  // --- 2. Lectura (reconocimiento o, sin él, medidor para el ritmo)
  function paso2() {
    const L = LECTURAS.find(l => l.id === "L27") || LECTURAS[0], txt = textoLimpio(L.texto), N = palabras(txt).length;
    app.innerHTML = `<div class="card">${diagMarco(2, "Lee en voz alta", `<p>Como si lo presentaras ante un auditorio, con tu ritmo natural.</p>
      <div class="target">${esc(txt)}</div><div class="trans" id="tr" aria-live="polite"></div><button class="btn" id="d-b">${D.modo === "medido" ? "🎯 Empezar a leer" : "🎙️ Empezar a leer"}</button><p class="sub" id="d-m"></p>`)}</div>`;
    const b = $("#d-b");
    b.onclick = async () => {
      if (D.modo === "medido") {
        if (rec) { b.disabled = true; const r = await rec.stop(); rec = null; parar && parar(); if (!vivo) return; return finLectura(r.text ? r : null); }
        rec = new Reconocedor(t => { $("#tr").textContent = t; }); const p = rec.start();
        b.textContent = "⏹️ Terminé"; b.className = "btn rec";
        try { await p; } catch (e) { rec = null; if (SR_FATAL.includes(e)) marcarFallaSR(e); D.modo = "auto"; toast("No se pudo medir con reconocimiento; sigo con el medidor."); return paso2(); }
        parar = autoParo(rec, () => b.click(), 2600); // en lectura se permiten pausas largas
      } else {
        if (ses) return ses.terminar();
        b.textContent = "⏹️ Terminé"; b.className = "btn rec"; $("#d-m").textContent = "Silencio un instante y lee…";
        ses = await sesionMic({ maxSeg: 60, silencioFin: 2.5, alFin: r => { ses = null; if (!vivo) return; const v = r.frames.filter(f => f.voz); finLectura(null, v.length ? v[v.length - 1].t - v[0].t : null); } });
      }
    };
    function finLectura(r, dur) {
      if (r) { const ok = lcsMatch(txt, r.text); D.acc = Math.round(ok.filter(Boolean).length / ok.length * 100); dur = r.hablaSecs; }
      let wpm = dur && dur >= 3 ? Math.round(N / (dur / 60)) : null; if (wpm != null && (wpm > 320 || wpm < 40)) wpm = null;
      D.wpm = wpm; paso3();
    }
  }

  // --- 3. Trabalenguas: uno corto por grupo de sonidos
  function paso3() {
    const lista = ORDEN_FON.map(f => TRABALENGUAS.find(t => t.f === f && t.n === 1)).filter(Boolean);
    let i = 0;
    const pinta = () => {
      const tw = lista[i];
      app.innerHTML = `<div class="card">${diagMarco(3, "Trabalenguas cortos", `<p>${D.modo === "medido" ? "Léelo una vez, claro y a buen ritmo. Se detiene solo cuando terminas." : "Léelo en voz alta una vez y califica qué tan claro te salió."}</p>
        <p class="diag-cont">${i + 1} de ${lista.length} · <b>${esc(FONEMAS[tw.f].nombre)}</b></p><div class="target" id="tg">${esc(tw.t)}</div>
        <div class="trans" id="tr" aria-live="polite"></div>
        ${D.modo === "medido" ? `<button class="btn" id="d-b">🎯 Leer</button>` : `<p><b>¿Qué tan claro te salió?</b></p><div class="escala5" role="group" aria-label="Claridad del 1 al 5">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}">${n}</button>`).join("")}</div><div class="escala5-ley"><span>Me trabé</span><span>Perfecto</span></div>`}`)}</div>`;
      const sig = v => { D.fon[tw.f] = v; i++; if (i < lista.length) pinta(); else paso4(); };
      if (D.modo !== "medido") { document.querySelectorAll(".escala5 button").forEach(x => x.onclick = () => sig((+x.dataset.n - 1) * 25)); return; }
      const b = $("#d-b");
      b.onclick = async () => {
        if (rec) { b.disabled = true; const r = await rec.stop(); rec = null; parar && parar(); if (!vivo) return;
          if (!r.text) { toast("No te escuché. Intenta de nuevo."); return pinta(); }
          const ok = lcsMatch(tw.t, r.text), acc = Math.round(ok.filter(Boolean).length / ok.length * 100);
          $("#tg").innerHTML = `${acc}% <span class="sub">de precisión</span>`; setTimeout(() => vivo && sig(acc), 700); return; }
        rec = new Reconocedor(t => { $("#tr").textContent = t; }); const p = rec.start();
        b.textContent = "⏹️ Listo"; b.className = "btn rec";
        try { await p; } catch (e) { rec = null; if (SR_FATAL.includes(e)) marcarFallaSR(e); D.modo = "auto"; toast("Sin reconocimiento: sigo con autocalificación."); return pinta(); }
        parar = autoParo(rec, () => b.click());
      };
    };
    pinta();
  }

  // --- 4. Improvisación 45 s
  function paso4() {
    const tema = (TEMAS.find(t => t.nivel === 1) || TEMAS[0]).t;
    app.innerHTML = `<div class="card">${diagMarco(4, "Improvisación", `<p>Habla 45 segundos del tema. No hay respuestas correctas: solo quiero escuchar tu fluidez.</p>
      <div class="target">${esc(tema)}</div><div class="timer" id="cd">45</div><div class="trans" id="tr" aria-live="polite"></div>
      <button class="btn" id="d-b">${D.modo === "medido" ? "🎯 Empezar" : "🎙️ Empezar"}</button><div id="d-x"></div>`)}</div>`;
    const b = $("#d-b"); let paraCD = null;
    const acabar = () => { paraCD && paraCD(); b.click(); };
    b.onclick = async () => {
      if (D.modo === "medido") {
        if (rec) { b.disabled = true; paraCD && paraCD(); const r = await rec.stop(); rec = null; if (!vivo) return;
          const dur = r.hablaSecs || r.secs, w = palabras(r.text).length, m = countMuletillas(r.segs);
          D.mulMin = dur >= 10 ? +(m.c / (dur / 60)).toFixed(1) : null; D.imWpm = dur >= 10 ? Math.round(w / (dur / 60)) : null; return resultado(); }
        rec = new Reconocedor(t => { $("#tr").textContent = t; }); const p = rec.start();
        b.textContent = "⏹️ Terminar"; b.className = "btn rec";
        try { await p; } catch (e) { rec = null; D.modo = "auto"; return paso4(); }
        paraCD = cuentaRegresiva(45, t => { const c = $("#cd"); if (c) c.textContent = t; }, acabar);
      } else {
        if (b.dataset.fin) return;
        b.dataset.fin = "1"; b.disabled = true;
        paraCD = cuentaRegresiva(45, t => { const c = $("#cd"); if (c) c.textContent = t; }, () => {
          $("#d-x").innerHTML = `<p><b>¿Qué tan fluido te sentiste?</b></p><div class="escala5">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}">${n}</button>`).join("")}</div><div class="escala5-ley"><span>Con muchas muletillas</span><span>Muy fluido</span></div>`;
          document.querySelectorAll("#d-x .escala5 button").forEach(x => x.onclick = () => { D.fluidez = +x.dataset.n; resultado(); });
        });
      }
    };
    cleanup = (c => () => { c(); paraCD && paraCD(); })(cleanup);
  }

  // --- Resultado
  function resultado() {
    const orden = ORDEN_FON.filter(f => D.fon[f] != null);
    const focos = orden.slice().sort((a, b) => D.fon[a] - D.fon[b] || orden.indexOf(a) - orden.indexOf(b)).slice(0, 2);
    const base = { fecha: today(), ts: Date.now(), modo: D.modo, db: D.db ?? null, f0: D.f0 ?? null, wpm: D.wpm ?? null, acc: D.acc ?? null, mulMin: D.mulMin ?? null, imWpm: D.imWpm ?? null, fluidez: D.fluidez ?? null, fon: D.fon, focos };
    S.diags = S.diags || []; S.diags.push(base);
    const primera = !S.baseline; if (primera) S.baseline = base;
    S.settings.focusList = focos; S.settings.focus = focos[0] || S.settings.focus;
    const lv = niveles(); focos.forEach(f => { lv.art[f] = D.fon[f] >= 90 ? 2 : 1; });
    if (D.wpm != null && D.acc != null) lv.read = D.acc >= 90 && D.wpm >= 120 && D.wpm <= 170 ? 2 : 1;
    if (D.mulMin != null) lv.impro = D.mulMin <= 2 ? 2 : 1;
    logSession("diag", { modo: D.modo });
    if (!S.badges.diag) { S.badges.diag = today(); toast("🧭 ¡Logro desbloqueado! Punto de partida"); }
    save();
    const fila = (n, v, u = "") => `<div class="dg-fila"><span>${n}</span><b>${v == null ? "—" : v + u}</b></div>`;
    app.innerHTML = `<div class="card">${diagMarco(5, primera ? "Tu línea base está lista" : "Diagnóstico registrado", `
      <p class="diag-lead">${primera ? "Con estos datos compararé tu avance cada semana." : "Tu línea base original se conserva para comparar. Si quieres, puedes usar este diagnóstico como nueva línea base."}</p>
      <h3>Te propongo trabajar</h3>
      <div class="dg-focos">${focos.map(f => `<div class="dg-foco"><b>${esc(FONEMAS[f].nombre)}</b><small>${D.modo === "medido" ? D.fon[f] + "% de precisión" : "tu calificación más baja"}</small></div>`).join("")}</div>
      <h3>Tus números de hoy</h3>
      ${fila("Ritmo de lectura", D.wpm, " ppm")}${fila("Claridad al leer", D.acc, "%")}${fila("Muletillas por minuto", D.mulMin)}${D.fluidez ? fila("Fluidez (autoevaluación)", D.fluidez, " de 5") : ""}${fila("Tono de voz", D.f0 ? nombreNota(D.f0) : null)}
      <h3>Precisión por sonido</h3><div class="dg-barras">${orden.map(f => `<div class="dg-barra"><span>${esc(FONEMAS[f].nombre)}</span><div class="meter"><div style="width:${D.fon[f]}%"></div></div><b>${D.fon[f]}</b></div>`).join("")}</div>
      <button class="btn" id="d-fin">Ir a mi rutina</button>${primera ? "" : `<button class="btn sec" id="d-nb">Usar como nueva línea base</button>`}`)}</div>`;
    $("#d-fin").onclick = () => go("hoy");
    if ($("#d-nb")) $("#d-nb").onclick = () => { S.baseline = base; save(); toast("Nueva línea base guardada"); go("hoy"); };
  }
};

// Detiene la medición sola cuando dejas de hablar (sin resultados nuevos durante "espera" ms).
function autoParo(rec, alParar, espera = 1800) {
  let ultimo = performance.now(), hubo = false; const orig = rec.onText;
  rec.onText = t => { ultimo = performance.now(); hubo = !!t; orig(t); };
  const iv = setInterval(() => { if (hubo && performance.now() - ultimo > espera) { clearInterval(iv); alParar(); } }, 200);
  return () => clearInterval(iv);
}
