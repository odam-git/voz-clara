// ====== Registro, rachas y logros ======
function logSession(type, data) {
  const s = { type, date: today(), ts: Date.now(), ...data };
  S.sessions.push(s);
  S.days[s.date] = (S.days[s.date] || 0) + 1;
  checkBadges(); save();
  return s;
}

const diaActivo = k => !!S.days[k] || S.freezeUsed.includes(k);

// Racha: días seguidos con práctica o comodín. Si hoy aún no practicas, cuenta desde ayer.
function streak() {
  let n = 0; const d = new Date();
  if (!diaActivo(dayStr(d))) d.setDate(d.getDate() - 1);
  while (diaActivo(dayStr(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// Mejor racha calculada con todo el historial (para quien viene de la v1 sin este dato).
function mejorRacha() {
  const ks = Object.keys(S.days).concat(S.freezeUsed).sort(); let best = 0, run = 0, prev = null;
  for (const k of [...new Set(ks)]) {
    const t = parseDay(k).getTime();
    run = prev != null && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1; prev = t; best = Math.max(best, run);
  }
  return best;
}

// Al abrir: cubre con comodines TODOS los días faltantes desde la última práctica, si alcanzan.
// Si no alcanzan, no se gasta ninguno y se avisa sin culpas.
function applyFreezes() {
  if (!S.sessions.length) return;
  const faltan = []; const d = new Date(); d.setDate(d.getDate() - 1);
  for (let i = 0; i < 90 && !diaActivo(dayStr(d)); i++) { faltan.push(dayStr(d)); d.setDate(d.getDate() - 1); }
  if (!faltan.length || !diaActivo(dayStr(d))) return; // sin huecos, o sin racha previa que cuidar
  if (faltan.length <= S.freezes) {
    S.freezes -= faltan.length; S.freezeUsed.push(...faltan); save();
    toast(faltan.length === 1 ? "🧊 Usé un comodín por el día que faltó: tu racha sigue." : `🧊 Usé ${faltan.length} comodines por los días que faltaron: tu racha sigue.`);
  } else {
    S.bestStreak = Math.max(S.bestStreak || 0, mejorRacha()); save();
    toast(`Hoy empieza una racha nueva. Tu mejor racha: ${S.bestStreak || 0} días. ¡Qué gusto verte de nuevo!`);
  }
}

const BADGES = [
  { id: "first", e: "🎙️", n: "Primera palabra", d: "Completa tu primer ejercicio", f: () => S.sessions.length >= 1 },
  { id: "routine", e: "✅", n: "Rutina completa", d: "Termina la rutina del día", f: () => Object.values(routineDone()).every(Boolean) },
  { id: "s3", e: "🔥", n: "Constancia", d: "Racha de 3 días", f: () => streak() >= 3 },
  { id: "s7", e: "🏅", n: "Una semana", d: "Racha de 7 días", f: () => streak() >= 7 },
  { id: "s30", e: "🏆", n: "Hábito de orador", d: "Racha de 30 días", f: () => streak() >= 30 },
  { id: "acc90", e: "🎯", n: "Precisión", d: "90% o más en un trabalenguas nivel 2+", f: () => S.sessions.some(s => s.type === "art" && s.level >= 2 && s.acc >= 90) },
  { id: "acc100", e: "💎", n: "Dicción perfecta", d: "100% en un trabalenguas nivel 3", f: () => S.sessions.some(s => s.type === "art" && s.level >= 3 && s.acc >= 100) },
  { id: "breath", e: "🌬️", n: "Pulmón de acero", d: "Exhalación sostenida de 25 s", f: () => S.sessions.some(s => s.type === "breath" && s.hold >= 25) },
  { id: "clean", e: "🧼", n: "Sin muletillas", d: "Improvisa 60 s con 0 muletillas (medido)", f: () => S.sessions.some(s => s.type === "impro" && s.modo === "medido" && s.secs >= 55 && s.words >= 60 && s.mul === 0) },
  { id: "pace", e: "⏱️", n: "Ritmo de orador", d: "Lectura entre 130 y 160 ppm", f: () => S.sessions.some(s => s.type === "read" && s.wpm >= 130 && s.wpm <= 160) },
  { id: "improve", e: "📈", n: "Mejora real", d: "Reduce 50% tus muletillas por minuto: últimos 7 días vs. tu primera semana", f: () => improvement() >= 50 },
  { id: "s100", e: "👑", n: "Cien sesiones", d: "Acumula 100 ejercicios", f: () => S.sessions.length >= 100 },
  // Estos se otorgan desde su módulo:
  { id: "diag", e: "🧭", n: "Punto de partida", d: "Completa tu diagnóstico inicial", f: () => !!S.badges.diag },
  { id: "vol", e: "📣", n: "Voz que llega", d: "Sostén 5 s tu voz en la meta de +6 dB", f: () => !!S.badges.vol },
  { id: "ento", e: "🎭", n: "Tres intenciones", d: "Logra afirmar, preguntar y enfatizar en una misma frase", f: () => !!S.badges.ento },
  { id: "pausa", e: "⏸️", n: "El poder del silencio", d: "Haz todas las pausas clave de un texto", f: () => !!S.badges.pausa },
  { id: "canto", e: "🎶", n: "Afinado", d: "Afina 8 de 9 notas de la escala", f: () => !!S.badges.canto },
  { id: "nivel3", e: "🧗", n: "Nivel experto", d: "Llega al nivel 3 en un ejercicio", f: () => !!S.badges.nivel3 },
  { id: "reporte", e: "🔭", n: "Mirada al avance", d: "Revisa tu reporte semanal", f: () => !!S.badges.reporte }
];

// % de reducción de muletillas/min: primera semana con improvisaciones medidas vs. últimos 7 días.
function improvement() {
  const im = S.sessions.filter(s => s.type === "impro" && s.mul != null && s.secs > 20);
  if (!im.length) return 0;
  const DIA = 864e5, t0 = parseDay(im[0].date).getTime(), hoy = parseDay(today()).getTime();
  if (hoy - t0 < 7 * DIA) return 0; // aún no termina la primera semana
  const primera = im.filter(s => parseDay(s.date).getTime() < t0 + 7 * DIA);
  const ultima = im.filter(s => parseDay(s.date).getTime() > hoy - 7 * DIA);
  if (primera.length < 2 || ultima.length < 2) return 0;
  const rate = a => a.reduce((x, s) => x + s.mul / (s.secs / 60), 0) / a.length;
  const a = rate(primera), b = rate(ultima);
  return a ? Math.round((1 - b / a) * 100) : 0;
}

function checkBadges() {
  for (const b of BADGES) if (!S.badges[b.id] && b.f()) { S.badges[b.id] = today(); toast(`${b.e} ¡Logro desbloqueado! ${b.n}`); }
  const st = streak();
  if (st > (S.bestStreak || 0)) S.bestStreak = st;
  // Un comodín por cada 7 días de racha (máximo 2 guardados).
  if (st > 0 && st % 7 === 0 && S.lastFreezeAt !== today() && S.freezes < 2) { S.freezes++; S.lastFreezeAt = today(); toast("🧊 Ganaste un comodín por 7 días seguidos."); }
}

function routineDone() {
  const t = S.sessions.filter(s => s.date === today());
  return Object.fromEntries(pasosHoy().map(([id]) => [id, t.some(s => s.type === id)]));
}
