// ====== Flujo en dos tiempos: "Medir" (solo reconocimiento) y "Escucharme" (solo grabación) ======
// cfg: { el, tipo, nivel, extra, evaluar(r) -> html, alIniciar(modo), alTerminar(modo), etiquetaMedir }
function medirYEscuchar(cfg) {
  let rec = null, med = null, paraMedidor = null, ocupado = false, vivo = true;
  const el = cfg.el;

  function pintar() {
    const sr = srEstado();
    el.innerHTML = `
      <div class="trans" data-id="tr" aria-live="polite"></div>
      ${sr === "ok"
        ? `<button class="btn" data-id="medir">🎯 ${cfg.etiquetaMedir || "Medir"}</button>`
        : `<div class="aviso" role="note"><b>Sin medición automática aquí.</b><div>${srAyuda()}</div>${SR && !IS_BRAVE ? `<button class="btn sec" data-id="re">Reintentar medir</button>` : ""}</div>`}
      <div data-id="res"></div>
      <button class="btn sec" data-id="esc">🎧 Escucharme</button>
      <div class="meter hidden" data-id="mt"><div></div></div>
      <div data-id="aud"></div>`;
    const q = id => el.querySelector(`[data-id="${id}"]`);
    const bMed = q("medir"), bEsc = q("esc"), bRe = q("re");
    if (bRe) bRe.onclick = () => { reintentarSR(); pintar(); toast("Listo, toca Medir para intentarlo."); };

    if (bMed) bMed.onclick = async () => {
      if (ocupado) return;
      if (!rec) {
        rec = new Reconocedor(t => { q("tr").textContent = t; });
        const p = rec.start(); // sin await previo: iOS exige el gesto
        bEsc.disabled = true; bMed.textContent = "⏹️ Detener"; bMed.className = "btn rec";
        q("res").innerHTML = ""; q("aud").innerHTML = ""; q("tr").textContent = "Escuchando…";
        try { await p; }
        catch (err) {
          rec = null; if (!vivo) return; bEsc.disabled = false;
          if (SR_FATAL.includes(err)) { marcarFallaSR(err); pintar(); toast("No se pudo usar el reconocimiento de voz."); }
          else { toast(MENSAJE_SR[err] || "No se pudo iniciar la medición. Intenta de nuevo."); pintar(); }
          return;
        }
        cfg.alIniciar && cfg.alIniciar("medir");
      } else {
        ocupado = true; bMed.disabled = true;
        const r = await rec.stop(); rec = null; ocupado = false; if (!vivo) return;
        cfg.alTerminar && cfg.alTerminar("medir");
        bMed.disabled = false; bMed.textContent = "🔁 Medir otra vez"; bMed.className = "btn"; bEsc.disabled = false;
        if (!r.text) {
          q("tr").textContent = "";
          if (SR_FATAL.includes(r.error)) { marcarFallaSR(r.error); pintar(); }
          toast(MENSAJE_SR[r.error] || "No te escuché. Acércate al micrófono e intenta de nuevo.");
          return;
        }
        marcarSRok();
        q("res").innerHTML = cfg.evaluar(r) +
          `<p class="sub">¿Quieres oírte? Toca <b>Escucharme</b> y repite el ejercicio: se graba sin reconocimiento.</p>`;
      }
    };

    bEsc.onclick = async () => {
      if (ocupado) return;
      if (!med) {
        med = new Medidor();
        bEsc.disabled = true;
        try { await med.start({ grabar: true }); } catch (_) { med = null; bEsc.disabled = false; return; }
        if (!vivo) { med.stop(); med = null; return; }
        bEsc.disabled = false; if (bMed) bMed.disabled = true;
        bEsc.textContent = "⏹️ Terminar"; bEsc.className = "btn rec"; q("aud").innerHTML = "";
        const mt = q("mt"); mt.classList.remove("hidden");
        paraMedidor = bucle(() => { mt.firstElementChild.style.width = (med.nivel() * 100) + "%"; });
        cfg.alIniciar && cfg.alIniciar("escuchar");
      } else {
        ocupado = true; paraMedidor && paraMedidor(); q("mt").classList.add("hidden");
        const r = await med.stop(); med = null; ocupado = false; if (!vivo) return;
        cfg.alTerminar && cfg.alTerminar("escuchar");
        bEsc.textContent = "🎧 Escucharme otra vez"; bEsc.className = "btn sec"; if (bMed) bMed.disabled = false;
        q("aud").innerHTML = (r.audio ? `<h3>Escúchate</h3><audio controls src="${r.audio}" style="width:100%"></audio>` : `<p class="sub">Este navegador no pudo grabar audio.</p>`) +
          estrellasHTML(srEstado() !== "ok");
        conectarEstrellas(q("aud"), n => logSession(cfg.tipo, { self: n, modo: "auto", level: cfg.nivel, secs: Math.round(r.secs), ...(cfg.extra || {}) }));
      }
    };
  }
  pintar();
  return {
    // Termina lo que esté activo (por ejemplo, al acabarse el tiempo de improvisación).
    terminar() { const b = el.querySelector(rec ? '[data-id="medir"]' : '[data-id="esc"]'); if ((rec || med) && b) b.click(); },
    detener() { vivo = false; if (rec) rec.abort(); rec = null; if (med) med.stop(); med = null; paraMedidor && paraMedidor(); }
  };
}

function estrellasHTML(requerida) {
  return `<div class="stars-box"><p><b>${requerida ? "Califícate para registrar tu práctica" : "Califícate (opcional)"}</b><br><small class="sub">1 = poco claro · 5 = muy claro y seguro</small></p>
    <div class="stars" role="radiogroup" aria-label="Autocalificación">${[1, 2, 3, 4, 5].map(n => `<button role="radio" aria-checked="false" aria-label="${n} de 5" data-n="${n}">★</button>`).join("")}</div><div class="sub" data-id="st-msg"></div></div>`;
}
function conectarEstrellas(cont, alGuardar) {
  const bs = [...cont.querySelectorAll(".stars button")]; let hecho = false;
  bs.forEach(b => b.onclick = () => {
    const n = +b.dataset.n;
    bs.forEach(x => { x.classList.toggle("on", +x.dataset.n <= n); x.setAttribute("aria-checked", x === b); });
    if (!hecho) { hecho = true; alGuardar(n); }
    cont.querySelector('[data-id="st-msg"]').textContent = `Guardado: ${n} de 5. Gracias por calificarte.`;
  });
}

// Cuenta regresiva basada en reloj (no se desfasa si el teléfono se pausa).
function cuentaRegresiva(segs, alTick, alFin) {
  const fin = Date.now() + segs * 1000;
  const iv = setInterval(() => {
    const r = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
    alTick(r); if (r <= 0) { clearInterval(iv); alFin && alFin(); }
  }, 250);
  alTick(segs);
  return () => clearInterval(iv);
}
