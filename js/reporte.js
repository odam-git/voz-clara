// ====== Reporte semanal: últimos 7 días contra la línea base (o contra la semana anterior) ======
const DIA_MS = 864e5;
function sesionesEntre(desde, hasta) { return S.sessions.filter(s => s.ts >= desde && s.ts < hasta); }
function inicioDia(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }

function metricasDe(ses) {
  const by = t => ses.filter(s => s.type === t);
  const art = by("art").filter(s => s.acc != null), read = by("read").filter(s => s.acc != null), wpm = by("read").filter(s => s.wpm != null);
  const im = by("impro").filter(s => s.mul != null && s.secs > 20), vol = by("vol"), ento = by("ento"), pz = by("pausa").filter(s => s.total), self = ses.filter(s => s.self != null);
  const avg = (a, f) => a.length ? +(a.reduce((x, s) => x + f(s), 0) / a.length).toFixed(1) : null;
  return {
    acc: avg(art, s => s.acc), clar: avg(read, s => s.acc), wpm: avg(wpm, s => s.wpm), mul: avg(im, s => s.mul / (s.secs / 60)),
    vol: vol.length ? Math.max(...vol.map(s => s.mejor || 0)) : null, ento: avg(ento, s => s.aciertos), pausa: avg(pz, s => s.hit / s.total * 100),
    self: avg(self, s => s.self), dias: new Set(ses.map(s => s.date)).size, n: ses.length
  };
}

// d: +1 = más es mejor; −1 = menos es mejor; 0 = cercanía a la banda 130–160.
const METRICAS = [
  ["acc", "Precisión en trabalenguas", "%", 1], ["clar", "Claridad al leer", "%", 1], ["wpm", "Ritmo de lectura", " ppm", 0], ["mul", "Muletillas por minuto", "", -1],
  ["vol", "Proyección sostenida en meta", " s", 1], ["ento", "Intenciones claras (de 3)", "", 1], ["pausa", "Pausas clave logradas", "%", 1], ["self", "Autoevaluación (de 5)", "", 1]
];
function comparar(k, d, ahora, antes) {
  if (ahora == null || antes == null) return null;
  const dist = v => v < 130 ? 130 - v : v > 160 ? v - 160 : 0;
  const mejora = d === 0 ? dist(antes) - dist(ahora) : d * (ahora - antes);
  const umbral = { acc: 2, clar: 2, wpm: 3, mul: 0.3, vol: 0.5, ento: 0.2, pausa: 5, self: 0.2 }[k];
  return mejora > umbral ? "mejor" : mejora < -umbral ? "abajo" : "igual";
}

function reporteSemanal() {
  const fin = inicioDia(Date.now()) + DIA_MS, ini = fin - 7 * DIA_MS;
  const sem = metricasDe(sesionesEntre(ini, fin)), prev = metricasDe(sesionesEntre(ini - 7 * DIA_MS, ini));
  const b = S.baseline || {};
  const base = { acc: b.fon ? promedio(Object.values(b.fon)) : null, clar: b.acc, wpm: b.wpm, mul: b.mulMin, vol: null, ento: null, pausa: null, self: null };
  const filas = METRICAS.map(([k, n, u, d]) => {
    const ref = base[k] != null ? base[k] : prev[k], fuente = base[k] != null ? "línea base" : "semana anterior";
    return { k, n, u, d, ahora: sem[k], ref: ref != null ? +(+ref).toFixed(1) : null, fuente, est: comparar(k, d, sem[k], ref) };
  }).filter(f => f.ahora != null || f.ref != null);
  const mejoras = filas.filter(f => f.est === "mejor"), abajo = filas.filter(f => f.est === "abajo");
  const sinDatos = METRICAS.filter(([k]) => sem[k] == null).map(([, n]) => n);
  return { ini, fin, sem, prev, filas, mejoras, abajo, sinDatos };
}

function reporteListo() {
  if (!S.sessions.length || (!S.baseline && Object.keys(S.days).length < 3)) return false;
  const ultimo = S.lastReport ? parseDay(S.lastReport).getTime() : (S.baseline ? S.baseline.ts : S.sessions[0].ts);
  return Date.now() - ultimo >= 7 * DIA_MS;
}

VIEWS.reporte = function () {
  const R = reporteSemanal(), f = d => new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "long" });
  const dias = [...Array(7)].map((_, i) => { const d = new Date(R.ini + i * DIA_MS); const k = dayStr(d); return { k, l: d.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "").slice(0, 2), on: !!S.days[k], frz: S.freezeUsed.includes(k) }; });
  const chip = e => e === "mejor" ? `<span class="chip ok">▲ mejor</span>` : e === "abajo" ? `<span class="chip op">oportunidad</span>` : e === "igual" ? `<span class="chip">estable</span>` : "";
  const v = (x, u) => x == null ? "—" : x + u;
  const sig = R.abajo[0] || (R.sinDatos.length ? null : R.filas.slice().sort((a, b) => (a.ahora ?? 0) - (b.ahora ?? 0))[0]);
  const ir = { acc: "art", clar: "read", wpm: "read", mul: "impro", vol: "vol", ento: "ento", pausa: "pausa", self: "art" };
  const texto = `Voz Clara · Semana del ${f(R.ini)} al ${f(R.fin - DIA_MS)}\nDías practicados: ${R.sem.dias} de 7 · Ejercicios: ${R.sem.n}\n` +
    R.filas.map(x => `${x.n}: ${v(x.ahora, x.u)} (${x.fuente}: ${v(x.ref, x.u)})`).join("\n");
  $("#app").innerHTML = `<div class="card rep">
    <p class="diag-paso">Reporte semanal</p><h2 class="diag-titulo">Semana del ${f(R.ini)} al ${f(R.fin - DIA_MS)}</h2>
    <div class="rep-dias" aria-label="Días practicados">${dias.map(d => `<div class="${d.on ? "on" : d.frz ? "frz" : ""}"><span>${d.on ? "✓" : d.frz ? "🧊" : ""}</span><small>${d.l}</small></div>`).join("")}</div>
    <p class="diag-lead"><b>${R.sem.dias} de 7 días</b> con práctica y <b>${R.sem.n} ejercicios</b>. ${R.sem.dias >= 5 ? "Constancia de orador." : R.sem.dias ? "Cada día cuenta; lo importante es volver." : "Esta semana fue de descanso: tu voz te espera."}</p>
    ${!S.baseline ? `<div class="aviso">Aún no tienes línea base: comparo con la semana anterior. <button class="btn sec" onclick="go('diag')">Hacer diagnóstico (3 min)</button></div>` : ""}
    ${R.mejoras.length ? `<h3>Lo que más avanzó</h3><p>${R.mejoras.map(x => `<span class="chip ok">${esc(x.n)}</span>`).join(" ")}</p>` : ""}
    <h3>Tus números</h3>
    <div class="rep-tabla" role="table">
      <div class="rep-fila rep-head" role="row"><span role="columnheader">Medida</span><span role="columnheader">Esta semana</span><span role="columnheader">Antes</span></div>
      ${R.filas.map(x => `<div class="rep-fila" role="row"><span role="cell">${esc(x.n)}${chip(x.est)}</span><b role="cell">${v(x.ahora, x.u)}</b><span role="cell" class="sub" title="${x.fuente}">${v(x.ref, x.u)}</span></div>`).join("") || `<p class="sub">Aún no hay suficientes ejercicios medidos esta semana.</p>`}
    </div>
    <p class="sub">«Antes» es tu línea base cuando existe; si no, la semana anterior.</p>
    ${sig ? `<h3>Siguiente enfoque</h3><p>${esc(sig.n)}: ${sig.est === "abajo" ? "bajó un poco frente a antes; unos días de práctica enfocada lo regresan." : "es tu área con más margen de crecimiento."}</p><button class="btn" onclick="go('${ir[sig.k]}')">Practicar ahora</button>` : ""}
    <button class="btn sec" id="rp-sh">Compartir resumen</button></div>`;
  $("#rp-sh").onclick = async () => {
    try { if (navigator.share) return await navigator.share({ title: "Mi semana en Voz Clara", text: texto }); } catch (_) { return; }
    try { await navigator.clipboard.writeText(texto); toast("Resumen copiado"); } catch (_) { toast("No se pudo copiar."); }
  };
  S.lastReport = today();
  if (!S.badges.reporte) { S.badges.reporte = today(); toast("🔭 ¡Logro desbloqueado! Mirada al avance"); }
  save();
};
