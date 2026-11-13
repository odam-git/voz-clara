// Carga los scripts de la app en un entorno aislado de Node (sin navegador) para probar su lógica.
// Uso: const app = cargar({ guardado: {...}, ahora: "2026-03-10T12:00:00" }); app.ev("streak()")
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const RAIZ = path.join(__dirname, "..");
const ORDEN = ["datos", "estado", "voz", "analisis", "flujo", "progreso", "adaptativo", "vistas", "modulos", "diagnostico", "reporte"];

function cargar({ guardado = null, ahora = "2026-03-10T12:00:00" } = {}) {
  const almacen = new Map();
  if (guardado) almacen.set("vozclara.v1", typeof guardado === "string" ? guardado : JSON.stringify(guardado));
  const nada = () => {};
  const elemento = () => new Proxy(function () {}, { get: (_, k) => (k === "classList" ? { toggle: nada, add: nada, remove: nada } : k === "style" || k === "dataset" ? {} : elemento()), set: () => true, apply: () => elemento() });
  const ctx = vm.createContext({
    console, setTimeout, clearTimeout, setInterval, clearInterval, Float32Array, Uint8Array, Math, JSON, Promise, Map, Set, Object, Array, Number, String, RegExp, Error, Intl,
    localStorage: { getItem: k => (almacen.has(k) ? almacen.get(k) : null), setItem: (k, v) => almacen.set(k, String(v)), removeItem: k => almacen.delete(k) },
    navigator: { userAgent: "node", platform: "node", maxTouchPoints: 0 },
    document: { addEventListener: nada, querySelector: () => elemento(), querySelectorAll: () => [], createElement: () => elemento(), body: elemento(), documentElement: elemento(), hidden: false },
    performance: { now: () => Date.now() }, requestAnimationFrame: nada, cancelAnimationFrame: nada, devicePixelRatio: 1,
    avisos: []
  });
  ctx.window = ctx; ctx.addEventListener = nada; ctx.matchMedia = () => ({ matches: false });
  // Reloj falso: "hoy" es la fecha indicada.
  vm.runInContext(`const __Real = Date; let __ahora = new __Real(${JSON.stringify(ahora)}).getTime();
    Date = class extends __Real { constructor(...a) { if (a.length) super(...a); else super(__ahora); } static now() { return __ahora; } };
    function fijarAhora(iso) { __ahora = new __Real(iso).getTime(); }`, ctx);
  for (const n of ORDEN) vm.runInContext(fs.readFileSync(path.join(RAIZ, "js", n + ".js"), "utf8"), ctx, { filename: n + ".js" });
  // Contenido real y avisos capturados en vez de mostrarse.
  const dato = f => fs.readFileSync(path.join(RAIZ, "data", f), "utf8");
  vm.runInContext(`toast = m => avisos.push(m);
    { const t = ${dato("trabalenguas.json")}; FONEMAS = t.fonemas; ORDEN_FON = t.orden; TRABALENGUAS = t.items.map((x, i) => ({ ...x, id: "W" + i })); }
    LECTURAS = ${dato("lecturas.json")}.items; TEMAS = ${dato("temas.json")}.items; TIPS = ${dato("consejos.json")}.items; ENTONACION = ${dato("entonacion.json")}.items;`, ctx);
  return { ctx, almacen, ev: codigo => vm.runInContext(codigo, ctx), avisos: () => ctx.avisos };
}
const dia = (n, base = "2026-03-10") => { const d = new Date(base + "T12:00:00"); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
module.exports = { cargar, dia };
