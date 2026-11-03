// ====== Contenido (archivos JSON en data/) ======
let FONEMAS = {}, ORDEN_FON = [], TRABALENGUAS = [], LECTURAS = [], TEMAS = [], TIPS = [];

async function cargarDatos() {
  const get = f => fetch("data/" + f).then(r => { if (!r.ok) throw new Error(f); return r.json(); });
  const [t, l, m, c] = await Promise.all(["trabalenguas.json", "lecturas.json", "temas.json", "consejos.json"].map(get));
  FONEMAS = t.fonemas; ORDEN_FON = t.orden; TRABALENGUAS = t.items;
  LECTURAS = l.items; TEMAS = m.items; TIPS = c.items;
}

// Texto para leer: quita las marcas de pausa "/" (se muestran aparte).
const textoLimpio = t => t.replace(/\s\/\s/g, " ").replace(/\s+/g, " ").trim();
// HTML con marcas de pausa visibles (‖) antes de las ideas clave.
const textoConPausas = t => esc(t).split(" / ").join(' <span class="pz" title="Pausa">‖</span> ');
