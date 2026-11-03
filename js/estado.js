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
    settings: { name: "", hour: "07:30", focus: "R" },
    onboarded: false, bestStreak: 0
  };
}

const isObj = o => o && typeof o === "object" && !Array.isArray(o);

// Valida y limpia cualquier objeto (guardado o importado). Lanza error si no es un respaldo de Voz Clara.
function normalizar(o) {
  if (!isObj(o) || !Array.isArray(o.sessions)) throw new Error("formato");
  const d = defaults();
  d.sessions = o.sessions
    .filter(s => isObj(s) && typeof s.type === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && Number.isFinite(s.ts))
    .map(s => {
      const c = {};
      for (const [k, v] of Object.entries(s)) if (typeof v === "number" ? Number.isFinite(v) : ["string", "boolean"].includes(typeof v) || v === null || isObj(v)) c[k] = v;
      return c;
    })
    .sort((a, b) => a.ts - b.ts);
  d.freezes = Math.max(0, Math.min(2, Number.isFinite(o.freezes) ? Math.floor(o.freezes) : 1));
  d.freezeUsed = Array.isArray(o.freezeUsed) ? o.freezeUsed.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)) : [];
  if (isObj(o.badges)) for (const [k, v] of Object.entries(o.badges)) if (typeof v === "string") d.badges[k] = v;
  if (isObj(o.settings)) {
    const st = o.settings;
    if (typeof st.name === "string") d.settings.name = st.name.slice(0, 40);
    if (/^\d{2}:\d{2}$/.test(st.hour)) d.settings.hour = st.hour;
    if (typeof st.focus === "string") d.settings.focus = st.focus;
    if (Array.isArray(st.focusList)) d.settings.focusList = st.focusList.filter(x => typeof x === "string");
  }
  for (const k of ["baseline", "levels", "lastReport", "volBase"]) if (isObj(o[k])) d[k] = o[k];
  if (Array.isArray(o.diags)) d.diags = o.diags.filter(isObj);
  if (typeof o.lastFreezeAt === "string") d.lastFreezeAt = o.lastFreezeAt;
  if (Number.isFinite(o.bestStreak)) d.bestStreak = o.bestStreak;
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
