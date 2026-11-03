// ====== Progresión adaptativa ======
// Cada área tiene un nivel (1–3). Sube con 3 resultados buenos seguidos y baja con 3 difíciles.
// Al bajar se dice "ajusté el reto", nunca como castigo.

function niveles() {
  if (!S.levels) S.levels = { art: {}, read: 1, impro: 1, desde: {} };
  S.levels.art = S.levels.art || {}; S.levels.desde = S.levels.desde || {};
  return S.levels;
}
function nivelArt(f) { return niveles().art[f] || 1; }
function nivelDe(area) { return niveles()[area] || 1; }

// Califica una sesión: "bien" | "dificil" | "regular" (null si no hay dato útil).
function calificar(area, s) {
  if (s.self != null) return s.self >= 5 ? "bien" : s.self <= 2 ? "dificil" : "regular";
  if (area === "art") return s.acc == null ? null : s.acc >= 90 ? "bien" : s.acc < 65 ? "dificil" : "regular";
  if (area === "read") {
    if (s.acc == null) return null;
    const ritmo = s.wpm != null && s.wpm >= 120 && s.wpm <= 170;
    return s.acc >= 90 && ritmo ? "bien" : s.acc < 70 ? "dificil" : "regular";
  }
  if (area === "impro") {
    if (s.mul == null || !s.secs) return null;
    const mm = s.mul / (s.secs / 60);
    return mm <= 2 && s.secs >= 30 ? "bien" : mm > 6 ? "dificil" : "regular";
  }
  return null;
}

// Se llama después de registrar una sesión de art/read/impro.
function ajustarNivel(area, s) {
  const lv = niveles(), clave = area === "art" ? "art:" + s.f : area;
  const actual = area === "art" ? nivelArt(s.f) : nivelDe(area);
  const desde = lv.desde[clave] || 0;
  const hist = S.sessions.filter(x => x.type === area && x.ts > desde && (area !== "art" || x.f === s.f) && (x.level || actual) === actual)
    .map(x => calificar(area, x)).filter(Boolean).slice(-3);
  if (hist.length < 3) return null;
  let nuevo = actual;
  if (hist.every(c => c === "bien") && actual < 3) nuevo = actual + 1;
  else if (hist.every(c => c === "dificil") && actual > 1) nuevo = actual - 1;
  if (nuevo === actual) return null;
  if (area === "art") lv.art[s.f] = nuevo; else lv[area] = nuevo;
  lv.desde[clave] = Date.now(); save();
  const nombre = { art: "Articulación" + (FONEMAS[s.f] ? " · " + FONEMAS[s.f].nombre : ""), read: "Lectura", impro: "Improvisación" }[area];
  toast(nuevo > actual ? `⬆️ ${nombre}: subes a nivel ${nuevo}. ¡Bien ganado!` : `${nombre}: ajusté el reto a nivel ${nuevo} para consolidar. Es parte del método.`);
  if (nuevo === 3 && !S.badges.nivel3) { S.badges.nivel3 = today(); toast("🧗 ¡Logro desbloqueado! Nivel experto"); save(); }
  return nuevo;
}

// Sonido a trabajar hoy: rota entre los focos elegidos por el diagnóstico (o el de Ajustes).
function focoDeHoy() {
  const lista = (S.settings.focusList && S.settings.focusList.length ? S.settings.focusList : [S.settings.focus]).filter(f => FONEMAS[f]);
  if (!lista.length) return ORDEN_FON[0];
  const hoy = S.sessions.filter(s => s.type === "art" && s.date === today());
  return lista.slice().sort((a, b) => hoy.filter(s => s.f === a).length - hoy.filter(s => s.f === b).length)[0];
}

// Elige contenido del nivel actual, evitando lo usado recientemente.
function elegir(lista, nivel, usados) {
  const rec = new Set(usados.slice(-8));
  let pool = lista.filter(x => (x.n || x.nivel) === nivel && !rec.has(x.id || x.t));
  if (!pool.length) pool = lista.filter(x => (x.n || x.nivel) === nivel);
  if (!pool.length) pool = lista;
  return pick(pool);
}
