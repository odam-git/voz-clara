// ====== Estado, fechas y almacenamiento ======
// Todo el historial vive solo en este dispositivo (localStorage).
const KEY = "vozclara.v1";

const pad = n => String(n).padStart(2, "0");
// Fecha local AAAA-MM-DD armada a mano (no depende del formato del navegador).
const dayStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dayStr(new Date());
const parseDay = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function defaults() {
  return {
    v: 2, sessions: [], days: {}, freezes: 1, freezeUsed: [], badges: {},
    settings: { name: "", hour: "07:30", focus: "RR" },
    onboarded: false, bestStreak: 0
  };
}

const isObj = o => o && typeof o === "object" && !Array.isArray(o);

// ===== Validación estricta de datos guardados o importados =====
// Un respaldo es un archivo ajeno: solo se aceptan campos conocidos, con el tipo esperado.
const esFecha = k => { if (typeof k !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(k)) return false; const [y, m, d] = k.split("-").map(Number); const x = new Date(y, m - 1, d); return y >= 2000 && y < 2200 && x.getMonth() === m - 1 && x.getDate() === d; };
const esId = s => typeof s === "string" && /^[A-Za-z0-9_:.-]{1,40}$/.test(s) && !(s in Object.prototype);
const num = (v, min = -1e9, max = 1e13) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined;
const SES_NUM = ["acc", "wpm", "mul", "words", "secs", "hold", "cycles", "self", "level", "mejor", "rel", "sobre", "aciertos", "total", "hit", "pausas", "rango"];
const SES_ID = ["modo", "f", "tid", "lid", "temaId", "fid"];

function limpiarSesion(s) {
  if (!isObj(s) || !esId(s.type) || !esFecha(s.date) || num(s.ts, 0) === undefined) return null;
  const c = { type: s.type, date: s.date, ts: s.ts };
  for (const k of SES_NUM) { const v = num(s[k]); if (v !== undefined) c[k] = v; else if (s[k] === null) c[k] = null; }
  for (const k of SES_ID) if (esId(s[k])) c[k] = s[k];
  if (typeof s.meta === "boolean") c.meta = s.meta;
  return c;
}
function mapaNum(o, min, max) {
  const r = {}; if (!isObj(o)) return r;
  for (const [k, v] of Object.entries(o)) if (esId(k) && num(v, min, max) !== undefined) r[k] = v;
  return r;
}
function limpiarLineaBase(b) {
  if (!isObj(b)) return null;
  const c = { fecha: esFecha(b.fecha) ? b.fecha : null, ts: num(b.ts, 0) ?? 0, modo: esId(b.modo) ? b.modo : "medido" };
  for (const k of ["db", "f0", "wpm", "acc", "mulMin", "imWpm", "fluidez"]) c[k] = num(b[k]) ?? null;
  c.fon = mapaNum(b.fon, 0, 100); c.fonSelf = mapaNum(b.fonSelf, 1, 5);
  // Líneas base antiguas sin reconocimiento guardaban estrellas como si fueran precisión: se separan.
  if (c.modo === "auto" && Object.keys(c.fon).length && !Object.keys(c.fonSelf).length) { for (const [k, v] of Object.entries(c.fon)) c.fonSelf[k] = Math.round(v / 25) + 1; c.fon = {}; }
  c.focos = Array.isArray(b.focos) ? b.focos.filter(esId).slice(0, 4) : [];
  return c;
}

// Valida y limpia cualquier objeto (guardado o importado). Lanza error si no es un respaldo de Voz Clara.
function normalizar(o) {
  if (!isObj(o) || !Array.isArray(o.sessions)) throw new Error("formato");
  const d = defaults();
  d.sessions = o.sessions.map(limpiarSesion).filter(Boolean).sort((a, b) => a.ts - b.ts);
  d.freezes = Math.max(0, Math.min(2, Number.isFinite(o.freezes) ? Math.floor(o.freezes) : 1));
  d.freezeUsed = Array.isArray(o.freezeUsed) ? [...new Set(o.freezeUsed.filter(esFecha))] : [];
  if (isObj(o.badges)) for (const [k, v] of Object.entries(o.badges)) if (esId(k) && esFecha(v)) d.badges[k] = v;
  if (isObj(o.settings)) {
    const st = o.settings;
    if (typeof st.name === "string") d.settings.name = st.name.slice(0, 40);
    if (typeof st.hour === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(st.hour)) d.settings.hour = st.hour;
    // Claves de la v1 (R, D, P, C) se traducen a los grupos nuevos.
    if (esId(st.focus)) d.settings.focus = ({ R: "RR", D: "DT", P: "PB", C: "KG" })[st.focus] || st.focus;
    if (Array.isArray(st.focusList)) d.settings.focusList = st.focusList.filter(esId).slice(0, 4);
  }
  const lb = limpiarLineaBase(o.baseline); if (lb) d.baseline = lb;
  if (Array.isArray(o.diags)) d.diags = o.diags.map(limpiarLineaBase).filter(Boolean).slice(-50);
  if (isObj(o.levels)) d.levels = { art: mapaNum(o.levels.art, 1, 3), read: num(o.levels.read, 1, 3) ?? 1, impro: num(o.levels.impro, 1, 3) ?? 1, desde: mapaNum(o.levels.desde, 0) };
  if (isObj(o.volBase) && num(o.volBase.db, -100, 0) !== undefined) d.volBase = { db: o.volBase.db, f0: num(o.volBase.f0, 50, 1000) ?? null, fecha: esFecha(o.volBase.fecha) ? o.volBase.fecha : null };
  for (const k of ["lastFreezeAt", "lastNotif", "lastReport", "avisoRacha"]) if (esFecha(o[k])) d[k] = o[k];
  const bs = num(o.bestStreak, 0, 100000); if (bs !== undefined) d.bestStreak = Math.floor(bs);
  // Quien ya usaba la v1 no debe ver otra vez la bienvenida.
  d.onboarded = o.onboarded === true || d.sessions.length > 0 || !!d.settings.name;
  recalcDays(d);
  return d;
}

function recalcDays(st) {
  st.days = {};
  for (const s of st.sessions) st.days[s.date] = (st.days[s.date] || 0) + 1;
}

let avisoInicio = null;
function cargar() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); }
  catch (_) { avisoInicio = "Este navegador no permite guardar datos (¿modo privado?). Tu avance no se conservará."; return defaults(); }
  if (!raw) return defaults();
  try { return normalizar(JSON.parse(raw)); }
  catch (_) {
    // No se pierde nada: se guarda una copia del dato dañado para recuperarlo después.
    try { localStorage.setItem(KEY + ".danado." + Date.now(), raw); } catch (_) {}
    avisoInicio = "Tus datos guardados estaban dañados. Guardé una copia y empecé limpio; puedes importar un respaldo en Ajustes.";
    return defaults();
  }
}

const S = cargar();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
  catch (_) { toast("No se pudo guardar. Libera espacio o exporta un respaldo."); return false; }
}

// Respaldo: reemplazar todo o combinar (útil para juntar el historial de Safari y el de la app instalada).
function importarRespaldo(obj, modo) {
  const nuevo = normalizar(obj);
  if (modo === "reemplazar") {
    for (const k of Object.keys(S)) delete S[k];
    Object.assign(S, nuevo);
  } else {
    const vistos = new Set(S.sessions.map(s => s.ts + "|" + s.type));
    for (const s of nuevo.sessions) if (!vistos.has(s.ts + "|" + s.type)) S.sessions.push(s);
    S.sessions.sort((a, b) => a.ts - b.ts);
    S.freezeUsed = [...new Set([...S.freezeUsed, ...nuevo.freezeUsed])];
    for (const [k, v] of Object.entries(nuevo.badges)) if (!S.badges[k] || v < S.badges[k]) S.badges[k] = v;
    for (const k of ["baseline", "levels", "volBase"]) if (!S[k] && nuevo[k]) S[k] = nuevo[k];
    if (nuevo.diags) S.diags = [...(S.diags || []), ...nuevo.diags.filter(d => !(S.diags || []).some(x => x.ts === d.ts))];
    S.bestStreak = Math.max(S.bestStreak || 0, nuevo.bestStreak || 0);
    if (!S.settings.name && nuevo.settings.name) S.settings.name = nuevo.settings.name;
    recalcDays(S);
  }
  S.onboarded = true;
  return save();
}

// Pide al navegador no borrar los datos (Safari los borra tras 7 días sin uso si no está instalada).
try { navigator.storage && navigator.storage.persist && navigator.storage.persist().catch(() => {}); } catch (_) {}
