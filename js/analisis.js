// ====== Análisis de texto reconocido ======

// Números a palabras (el reconocimiento escribe "3 tigres" en vez de "tres tigres").
const UNI = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince",
  "dieciseis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidos", "veintitres", "veinticuatro", "veinticinco", "veintiseis", "veintisiete", "veintiocho", "veintinueve"];
const DEC = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CEN = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
function numALetras(n) {
  if (n < 30) return UNI[n];
  if (n < 100) return DEC[Math.floor(n / 10)] + (n % 10 ? " y " + UNI[n % 10] : "");
  if (n === 100) return "cien";
  if (n < 1000) return CEN[Math.floor(n / 100)] + (n % 100 ? " " + numALetras(n % 100) : "");
  if (n < 1e6) { const m = Math.floor(n / 1000); return (m === 1 ? "mil" : numALetras(m) + " mil") + (n % 1000 ? " " + numALetras(n % 1000) : ""); }
  return String(n);
}

const norm = s => String(s || "").toLowerCase()
  .replace(/\d+/g, m => " " + numALetras(parseInt(m, 10)) + " ")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const palabras = s => { const n = norm(s); return n ? n.split(" ") : []; };

// Alinea el texto objetivo con lo reconocido: true por cada palabra objetivo que sí se entendió.
function lcsMatch(target, said) {
  const a = palabras(target), b = palabras(said);
  const m = a.length, n = b.length, dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ok = new Array(m).fill(false); let i = 0, j = 0;
  while (i < m && j < n) { if (a[i] === b[j]) { ok[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return ok;
}
// Para resaltar: separa el texto visible en palabras con la misma cuenta que palabras().
function palabrasVisibles(texto) {
  const out = [];
  for (const w of texto.split(/\s+/).filter(Boolean)) { const k = palabras(w).length; if (k) { out.push({ w, k }); } else if (out.length) out[out.length - 1].w += " " + w; }
  return out;
}

// ====== Muletillas según contexto ======
// Claras: casi siempre son relleno.
const MUL_CLARAS = ["o sea", "osea", "eh", "ehh", "em", "emm", "mmm", "mm", "digamos", "basicamente", "literal", "tipo que"];
// Palabras funcionales: "este" seguido de una de ellas no es demostrativo ("este proyecto" sí lo es).
const FUNC = new Set("el la los las un una unos unas que de del en y o a al pues bueno este eh em mmm yo tu se me te lo le les nos no si porque cuando pero entonces como".split(" "));
const RELLENO = new Set("pues este eh em mmm bueno entonces o".split(" "));
const ANTES_NO_LEGIT = new Set("que creo dije todavia aun ya porque eso si o ni yo tu".split(" "));
const ANTES_VERDAD_LEGIT = new Set("la es una mi su de esa toda tu".split(" "));

// segs: segmentos que entrega el reconocimiento (se cortan en las pausas). Devuelve {c, found}.
function countMuletillas(segs) {
  if (typeof segs === "string") segs = [segs];
  let c = 0; const found = {};
  const suma = k => { c++; found[k] = (found[k] || 0) + 1; };
  for (const seg of segs) {
    let w = palabras(seg);
    // claras de dos palabras
    for (let i = 0; i < w.length - 1; i++) {
      const par = w[i] + " " + w[i + 1];
      if (par === "o sea" || par === "tipo que") { suma(par); w.splice(i, 2, "·"); }
    }
    for (let i = 0; i < w.length; i++) {
      const x = w[i], sig = w[i + 1], ant = w[i - 1], ini = i === 0, fin = i === w.length - 1;
      if (MUL_CLARAS.includes(x)) { suma(x === "osea" ? "o sea" : x); continue; }
      if (x === "este" && (fin || FUNC.has(sig))) { suma("este"); continue; }
      if (x === "bueno" && (ini || RELLENO.has(sig))) { suma("bueno"); continue; }
      if (x === "pues" && (ini || RELLENO.has(sig) || ant === "pues")) { suma("pues"); continue; }
      if (x === "entonces" && (RELLENO.has(sig) || ant === "entonces")) { suma("entonces"); continue; }
      if (x === "no" && fin && w.length > 2 && !ANTES_NO_LEGIT.has(ant)) { suma("¿no?"); continue; }
      if (x === "verdad" && fin && w.length > 2 && !ANTES_VERDAD_LEGIT.has(ant)) { suma("¿verdad?"); continue; }
    }
  }
  return { c, found };
}
