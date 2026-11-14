// ====== Práctica jurídica: modo audiencia, construcción de argumentos y mis asuntos ======
// Todo funciona con guiones y plantillas: no hay inteligencia artificial ni servidor.
// Los asuntos del usuario se guardan solo en el dispositivo (S.casos).

const MAX_CASOS = 20, MAX_CAMPO = 800;
const casosTodos = () => [...JUR.casos, ...(S.casos || [])];
const casoPorId = id => casosTodos().find(c => c.id === id) || null;
const materiaDe = caso => JUR.materias[caso.materia];

// Sustituye {campo} por el dato del asunto. Devuelve TEXTO PLANO (se escapa al mostrarlo).
function rellenarTexto(plantilla, caso) {
  const campos = materiaDe(caso).campos;
  return plantilla.replace(/\{(\w+)\}/g, (m, k) => {
    const v = String((caso.campos && Object.prototype.hasOwnProperty.call(caso.campos, k) && caso.campos[k]) || "").trim();
    if (v) return v;
    const c = campos.find(x => x.k === k);
    return "[falta: " + (c ? c.n.toLowerCase() : k) + "]";
  });
}
const rellenar = (plantilla, caso) => esc(rellenarTexto(plantilla, caso));

// Lee un texto en voz alta con la voz del teléfono (no usa internet ni micrófono).
function decir(texto) {
  if (!("speechSynthesis" in window)) return toast("Este navegador no puede leer en voz alta.");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto); u.lang = "es-MX"; u.rate = 0.95;
  const v = speechSynthesis.getVoices().find(x => /^es[-_]MX/i.test(x.lang)) || speechSynthesis.getVoices().find(x => /^es/i.test(x.lang));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
const callar = () => { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (_) {} };

const barraPasos = (i, n) => `<div class="diag-prog" style="grid-template-columns:repeat(${n},1fr)" role="progressbar" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${i + 1}">${[...Array(n)].map((_, k) => `<span class="${k < i ? "hecho" : k === i ? "act" : ""}"></span>`).join("")}</div>`;
const opcionesCaso = (sel, filtro) => casosTodos().filter(c => !filtro || filtro(c)).map(c => `<option value="${esc(c.id)}" ${c.id === sel ? "selected" : ""}>${esc(c.titulo)}</option>`).join("");
const resumenCaso = caso => `<details class="plegable"><summary>Ver los datos del asunto</summary><dl class="ficha">${materiaDe(caso).campos.map(c => `<dt>${esc(c.n)}</dt><dd>${esc((caso.campos || {})[c.k] || "—")}</dd>`).join("")}</dl></details>`;
const listaCotejo = items => `<fieldset class="cotejo"><legend>Lista de cotejo: marca lo que sí lograste</legend>${items.map((t, i) => `<label><input type="checkbox" data-c="${i}"><span>${esc(t)}</span></label>`).join("")}</fieldset>`;
const marcados = () => document.querySelectorAll(".cotejo input:checked").length;

// Medición de una intervención hablada: ritmo, muletillas y duración contra el tiempo sugerido.
function turnoHablado(el, tipo, extra, seg, alMedir) {
  let paraCD = null;
  const ctl = medirYEscuchar({
    el, tipo, extra, etiquetaMedir: "Medir mi intervención",
    alIniciar: () => { callar(); paraCD = cuentaRegresiva(seg, t => { const c = $("#j-cd"); if (c) { c.textContent = t; c.classList.toggle("fin", t === 0); } }); },
    alTerminar: () => { paraCD && paraCD(); paraCD = null; },
    evaluar: r => {
      const dur = r.hablaSecs || r.secs, w = palabras(r.text).length, m = countMuletillas(r.segs), wpm = calcularWpm(w, dur);
      alMedir({ mul: m.c, wpm, secs: Math.round(dur), words: w });
      const tiempo = dur > seg * 1.25 ? "Te pasaste del tiempo: quita lo accesorio." : dur < seg * 0.4 ? "Fue muy breve: desarrolla un poco más cada punto." : "Buen manejo del tiempo.";
      const lst = Object.entries(m.found).map(([k, v]) => `<span class="pill">${esc(k)} ×${v}</span>`).join("");
      return `<div class="stats" style="margin-top:12px"><div class="stat"><b>${Math.round(dur)}s</b><span>de ${seg}s sugeridos</span></div><div class="stat"><b>${wpm ?? "—"}</b><span>palabras/min</span></div><div class="stat"><b>${m.c}</b><span>muletillas</span></div></div><p>${tiempo} ${lst}</p>`;
    }
  });
  return { detener: () => { paraCD && paraCD(); ctl.detener(); } };
}

let ultimaAud = null, ultimoArg = null; // recuerda la última selección mientras la app está abierta

Object.assign(VIEWS, {
  // ===================== MODO AUDIENCIA =====================
  aud(est) {
    if (est && est.aid) return audEtapa(est);
    const sel = ultimaAud || { caso: JUR.casos[0].id };
    const pinta = () => {
      const caso = casoPorId(sel.caso) || JUR.casos[0], mat = materiaDe(caso);
      const auds = JUR.audiencias.filter(a => a.materia === caso.materia);
      if (!auds.some(a => a.id === sel.aid)) sel.aid = auds[0].id;
      if (!mat.roles[sel.rol]) sel.rol = Object.keys(mat.roles)[0];
      const a = auds.find(x => x.id === sel.aid);
      $("#app").innerHTML = `<div class="card"><h2>⚖️ Modo audiencia</h2>
        <p>Practica una audiencia etapa por etapa. La app te da la palabra como lo haría el tribunal; tú respondes en voz alta y mides tu ritmo, tus muletillas y tu tiempo.</p>
        <p class="sub">Es un guion de práctica: no sustituye el estudio del expediente ni de la ley.</p>
        <label for="j-caso">1. Asunto</label><select id="j-caso">${opcionesCaso(caso.id)}</select>
        <button class="btn sec" data-go="casos">📁 Mis asuntos (agregar el mío)</button>
        <label for="j-aud">2. Audiencia</label><select id="j-aud">${auds.map(x => `<option value="${x.id}" ${x.id === a.id ? "selected" : ""}>${esc(mat.nombre)} · ${esc(x.n)}</option>`).join("")}</select>
        <label>3. Tu papel</label><div class="seg" role="radiogroup">${Object.entries(mat.roles).map(([id, n]) => `<button role="radio" aria-checked="${id === sel.rol}" class="${id === sel.rol ? "on" : ""}" data-rol="${id}">${esc(n)}</button>`).join("")}</div>
        <p class="sub">${esc(a.fund)}<br>ℹ️ ${esc(a.nota)}</p>
        ${resumenCaso(caso)}
        <h3>Etapas (${a.etapas.length})</h3><ol class="diag-lista">${a.etapas.map(e => `<li>${esc(e.n)}${e.guia[sel.rol] ? "" : ` <span class="sub">(solo escuchas)</span>`}</li>`).join("")}</ol>
        <button class="btn" id="j-go">Empezar audiencia</button></div>`;
      $("#j-caso").onchange = e => { sel.caso = e.target.value; sel.aid = null; pinta(); };
      $("#j-aud").onchange = e => { sel.aid = e.target.value; pinta(); };
      document.querySelectorAll("[data-rol]").forEach(b => b.onclick = () => { sel.rol = b.dataset.rol; pinta(); });
      $("#j-go").onclick = () => { ultimaAud = { ...sel }; go("aud", { caso: caso.id, aid: a.id, rol: sel.rol, i: 0, res: [] }); };
    };
    pinta();
  },

  // ===================== CONSTRUCCIÓN DE ARGUMENTOS =====================
  arg(est) {
    if (est && est.met) return argPaso(est);
    const sel = ultimoArg || { met: "toulmin", caso: JUR.casos[0].id };
    const pinta = () => {
      const m = ARG.metodos.find(x => x.id === sel.met) || ARG.metodos[0];
      const caso = sel.caso === "libre" ? null : (casoPorId(sel.caso) || JUR.casos[0]);
      $("#app").innerHTML = `<div class="card"><h2>🧩 Construcción de argumentos</h2>
        <p>Arma un argumento paso a paso con el método de un autor y dilo en voz alta. Al final, lo expones completo.</p>
        <label>1. Método</label><div class="seg seg-4" role="radiogroup">${ARG.metodos.map(x => `<button role="radio" aria-checked="${x.id === m.id}" class="${x.id === m.id ? "on" : ""}" data-met="${x.id}">${esc(x.autor.split(" ").pop())}</button>`).join("")}</div>
        <h3>${esc(m.autor)}</h3><p class="sub">${esc(m.obra)}</p>
        <p><b>${esc(m.lema)}</b></p><p>${esc(m.idea)}</p><p><b>Te sirve para:</b> ${esc(m.sirve)}</p>
        <ol class="diag-lista">${m.pasos.map(p => `<li><b>${esc(p.n)}.</b> ${esc(p.q)}</li>`).join("")}</ol>
        <details class="plegable"><summary>Comparar a los cuatro autores</summary><div class="tabla-dif">${ARG.diferencias.filas.map(f => `<div><b>${esc(f[0])}</b><p><i>${esc(f[1])}</i></p><p>Parte de: ${esc(f[2])}.</p><p>Sirve para: ${esc(f[3])}.</p></div>`).join("")}</div></details>
        <p class="sub">ℹ️ ${esc(ARG.nota)}</p>
        <label for="j-caso">2. Asunto</label><select id="j-caso">${opcionesCaso(sel.caso)}<option value="libre" ${sel.caso === "libre" ? "selected" : ""}>Tema libre (sin asunto)</option></select>
        <button class="btn sec" data-go="casos">📁 Mis asuntos (agregar el mío)</button>
        ${caso ? resumenCaso(caso) : ""}
        <button class="btn" id="j-go">Empezar con ${esc(m.autor.split(" ").pop())}</button></div>`;
      document.querySelectorAll("[data-met]").forEach(b => b.onclick = () => { sel.met = b.dataset.met; pinta(); });
      $("#j-caso").onchange = e => { sel.caso = e.target.value; pinta(); };
      $("#j-go").onclick = () => { ultimoArg = { ...sel }; go("arg", { met: m.id, caso: sel.caso, i: 0, res: [] }); };
    };
    pinta();
  },

  // ===================== MIS ASUNTOS =====================
  casos(est) {
    if (est && est.editar) return casoForm(est.editar === true ? null : est.editar, est.materia);
    const mios = S.casos || [];
    $("#app").innerHTML = `<div class="card"><h2>📁 Mis asuntos</h2>
      <p>Captura los datos básicos de un asunto y la app adapta a él las audiencias y los argumentos.</p>
      <div class="aviso" role="note"><b>Cuida la confidencialidad.</b> Los asuntos se guardan <b>solo en este dispositivo</b> y se incluyen en tu respaldo si lo exportas. Usa iniciales o nombres ficticios y no captures datos sensibles.</div>
      ${mios.length ? mios.map(c => `<div class="step"><span class="t">${esc(c.titulo)}<small>${esc(materiaDe(c).nombre)}</small></span><button class="mini" data-ed="${esc(c.id)}">Editar</button><button class="mini" data-del="${esc(c.id)}">Borrar</button></div>`).join("") : `<p class="sub">Aún no tienes asuntos propios. Los ejemplos penal y civil ya vienen incluidos.</p>`}
      ${mios.length >= MAX_CASOS ? `<p class="sub">Llegaste al máximo de ${MAX_CASOS} asuntos. Borra alguno para agregar otro.</p>` : `<h3>Nuevo asunto</h3><div class="row">${Object.entries(JUR.materias).map(([id, m]) => `<button class="btn sec" data-nuevo="${id}">➕ ${esc(m.nombre)}</button>`).join("")}</div>`}
      <button class="btn" data-go="aud">Ir al modo audiencia</button><button class="btn sec" data-go="arg">Ir a construcción de argumentos</button></div>`;
    document.querySelectorAll("[data-nuevo]").forEach(b => b.onclick = () => go("casos", { editar: true, materia: b.dataset.nuevo }));
    document.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => go("casos", { editar: b.dataset.ed }));
    document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
      const c = mios.find(x => x.id === b.dataset.del);
      if (c && confirm(`¿Borrar el asunto «${c.titulo}»? No se puede deshacer.`)) { S.casos = mios.filter(x => x !== c); save(); toast("Asunto borrado"); go("casos"); }
    });
  }
});

function casoForm(id, materiaNueva) {
  const previo = id ? (S.casos || []).find(c => c.id === id) : null;
  const materia = previo ? previo.materia : (Object.prototype.hasOwnProperty.call(JUR.materias, materiaNueva) ? materiaNueva : "penal");
  const mat = JUR.materias[materia], v = k => esc(previo ? (previo.campos[k] || "") : "");
  $("#app").innerHTML = `<div class="card"><h2>${previo ? "Editar asunto" : "Nuevo asunto"} · ${esc(mat.nombre)}</h2>
    <p class="sub">Solo se guarda en este dispositivo. Usa iniciales o nombres ficticios. Lo que dejes vacío aparecerá como «[falta…]» en el guion.</p>
    <label for="c-tit">Nombre para identificarlo</label><input id="c-tit" maxlength="80" placeholder="Ej.: Robo · audiencia del lunes" value="${esc(previo ? previo.titulo : "")}">
    ${mat.campos.map(c => `<label for="c-${c.k}">${esc(c.n)}</label>${c.corto ? `<input id="c-${c.k}" maxlength="160" value="${v(c.k)}">` : `<textarea id="c-${c.k}" rows="3" maxlength="${MAX_CAMPO}">${v(c.k)}</textarea>`}<small class="sub">${esc(c.a)}</small>`).join("")}
    <button class="btn" id="c-ok">Guardar asunto</button><button class="btn sec" data-go="casos">Cancelar</button></div>`;
  $("#c-ok").onclick = () => {
    const titulo = $("#c-tit").value.trim().slice(0, 80);
    if (!titulo) { toast("Ponle un nombre para identificarlo."); $("#c-tit").focus(); return; }
    const campos = {};
    for (const c of mat.campos) { const t = $("#c-" + c.k).value.replace(/\s+/g, " ").trim().slice(0, MAX_CAMPO); if (t) campos[c.k] = t; }
    S.casos = S.casos || [];
    if (previo) { previo.titulo = titulo; previo.campos = campos; }
    else {
      if (S.casos.length >= MAX_CASOS) return toast("Llegaste al máximo de asuntos.");
      S.casos.push({ id: "C" + Date.now().toString(36), materia, titulo, campos });
    }
    if (save()) { toast("Asunto guardado"); go("casos"); }
  };
}

function audEtapa(est) {
  const caso = casoPorId(est.caso), a = JUR.audiencias.find(x => x.id === est.aid);
  if (!caso || !a || caso.materia !== a.materia) return go("aud");
  if (est.i >= a.etapas.length) return audResumen(est, caso, a);
  const e = a.etapas[est.i], mat = materiaDe(caso), rol = mat.roles[est.rol] ? est.rol : Object.keys(mat.roles)[0];
  const otro = Object.keys(mat.roles).find(r => r !== rol), habla = !!e.guia[rol];
  const esEjemplo = !!caso.ejemplo && caso.id === a.caso;
  const juez = rellenarTexto(e.juez, caso);
  const contraTxt = esEjemplo && e.modelo[otro] ? e.modelo[otro] : (e.contra[rol] ? rellenarTexto(e.contra[rol], caso) : "");
  const contraAntes = e.orden.indexOf(otro) > -1 && (!habla || e.orden.indexOf(otro) < e.orden.indexOf(rol));
  const bloqueContra = contraTxt ? `<div class="voz-otra"><b>${esc(mat.roles[otro])}</b><p>${esc(contraTxt)}</p></div>` : "";
  let med = null, turno = null;
  $("#app").innerHTML = `<div class="card">${barraPasos(est.i, a.etapas.length)}
    <p class="diag-paso">${esc(mat.nombre)} · ${esc(a.n)} · Etapa ${est.i + 1} de ${a.etapas.length}</p>
    <h2 class="diag-titulo">${esc(e.n)}</h2><p>${esc(e.obj)}</p>
    <div class="voz-juez"><b>⚖️ Tribunal</b><p>${esc(juez)}</p><button class="mini" id="j-oir">🔊 Escuchar</button></div>
    ${contraAntes ? bloqueContra : ""}
    ${habla ? `<h3>Tu turno · ${esc(mat.roles[rol])}</h3>
      <ul class="guia">${e.guia[rol].map(g => `<li>${rellenar(g, caso)}</li>`).join("")}</ul>
      <div class="timer chico" id="j-cd" aria-label="Segundos sugeridos">${e.seg}</div>
      <div id="flujo"></div>
      ${listaCotejo(e.cotejo[rol])}
      <details class="plegable"><summary>Ver un ejemplo de esta intervención</summary>${esEjemplo ? "" : `<p class="sub">Ejemplo con el asunto de muestra, solo como referencia de estructura.</p>`}<p>${esc(e.modelo[rol])}</p></details>
      ${contraAntes ? "" : bloqueContra}`
      : `<p class="sub">En esta etapa tu papel no interviene. Escucha con atención: anotar lo que dice la contraparte también se entrena.</p>`}
    <button class="btn" id="j-sig">${est.i + 1 < a.etapas.length ? "Siguiente etapa" : "Terminar audiencia"}</button>
    <button class="btn sec" data-go="aud">Salir de la audiencia</button></div>`;
  $("#j-oir").onclick = () => decir(juez + (contraAntes && contraTxt ? " " + contraTxt : ""));
  if (habla) turno = turnoHablado($("#flujo"), "aud", { aid: a.id, eid: e.id, rol }, e.seg, m => { med = m; });
  $("#j-sig").onclick = () => {
    const res = est.res.slice();
    if (habla) {
      const tot = e.cotejo[rol].length, ok = marcados(), cot = Math.round(ok / tot * 100);
      if (med || ok) {
        logSession("aud", { aid: a.id, eid: e.id, rol, cot, ...(med ? { mul: med.mul, wpm: med.wpm, secs: med.secs, words: med.words, modo: "medido" } : { modo: "cotejo" }) });
        res.push({ n: e.n, cot, mul: med ? med.mul : null });
      } else res.push({ n: e.n, cot: null, mul: null });
    }
    go("aud", { ...est, rol, i: est.i + 1, res });
  };
  cleanup = () => { callar(); turno && turno.detener(); };
}

function audResumen(est, caso, a) {
  const hechas = est.res.filter(r => r.cot != null), mat = materiaDe(caso), otro = Object.keys(mat.roles).find(r => r !== est.rol);
  const prom = hechas.length ? Math.round(hechas.reduce((x, r) => x + r.cot, 0) / hechas.length) : null;
  if (hechas.length && hechas.length === est.res.length && !S.badges.aud) { S.badges.aud = today(); save(); toast("⚖️ ¡Logro desbloqueado! Con la venia"); }
  $("#app").innerHTML = `<div class="card"><p class="diag-paso">${esc(mat.nombre)} · ${esc(a.n)}</p><h2 class="diag-titulo">Audiencia terminada</h2>
    <p class="diag-lead">${hechas.length ? `Practicaste <b>${hechas.length} de ${est.res.length}</b> intervenciones como ${esc(mat.roles[est.rol])}${prom != null ? `, con <b>${prom}%</b> de tu lista de cotejo` : ""}.` : "Recorriste la audiencia sin registrar intervenciones. La próxima vez, mide o marca tu lista de cotejo."}</p>
    ${est.res.map(r => `<div class="dg-fila"><span>${esc(r.n)}</span><b>${r.cot == null ? "—" : r.cot + "%"}${r.mul != null ? ` · ${r.mul} mul.` : ""}</b></div>`).join("")}
    <p class="sub">El porcentaje es tu propia lista de cotejo; «mul.» son las muletillas detectadas.</p>
    <button class="btn" id="j-otro">Repetir como ${esc(mat.roles[otro])}</button>
    <button class="btn sec" data-go="aud">Elegir otra audiencia</button><button class="btn sec" data-go="hoy">Volver al inicio</button></div>`;
  $("#j-otro").onclick = () => go("aud", { caso: caso.id, aid: a.id, rol: otro, i: 0, res: [] });
}

function argPaso(est) {
  const m = ARG.metodos.find(x => x.id === est.met), caso = est.caso === "libre" ? null : casoPorId(est.caso);
  if (!m || (est.caso !== "libre" && !caso)) return go("arg");
  const n = m.pasos.length + 1, final = est.i === m.pasos.length;
  if (est.i > m.pasos.length) return argResumen(est, m);
  const p = final ? { id: "todo", n: "Argumento completo", q: "Une todas las piezas y expón tu argumento de corrido.", a: "Sin leer. Haz una pausa antes de tu petición.", seg: 90 } : m.pasos[est.i];
  const ejId = caso && caso.ejemplo ? caso.id : (caso ? JUR.casos.find(c => c.materia === caso.materia) : JUR.casos[0]).id;
  const mod = ARG.modelos[ejId], modelo = final ? m.pasos.map(x => mod[m.id][x.id]).join(" ") : mod[m.id][p.id];
  const propio = !caso || !caso.ejemplo;
  let med = null;
  $("#app").innerHTML = `<div class="card">${barraPasos(est.i, n)}
    <p class="diag-paso">${esc(m.autor)} · Paso ${est.i + 1} de ${n}</p>
    <h2 class="diag-titulo">${esc(p.n)}</h2><p class="diag-lead">${esc(p.q)}</p><p class="sub">${esc(p.a)}</p>
    ${caso ? `<p><b>Asunto:</b> ${esc(caso.titulo)}${caso.ejemplo ? ` · <span class="sub">${esc(mod.postura)}</span>` : ""}</p>${resumenCaso(caso)}` : `<p class="sub">Tema libre: elige una tesis que quieras defender y mantenla en todos los pasos.</p>`}
    <div class="timer chico" id="j-cd">${p.seg}</div><div id="flujo"></div>
    ${listaCotejo(final ? ["Dije todas las piezas del método", "Sonó como un solo argumento, no como una lista", "Hice pausa antes de la petición"] : ["Respondí la pregunta de este paso", "Fui concreto: una o dos frases"])}
    <details class="plegable"><summary>Ver un ejemplo</summary>${propio ? `<p class="sub">Ejemplo con el asunto de muestra (${esc(mod.postura)}), solo como referencia de estructura.</p>` : ""}<p>${esc(modelo)}</p></details>
    <button class="btn" id="j-sig">${final ? "Terminar" : "Siguiente paso"}</button><button class="btn sec" data-go="arg">Salir</button></div>`;
  const turno = turnoHablado($("#flujo"), "arg", { fid: m.id, eid: p.id }, p.seg, x => { med = x; });
  $("#j-sig").onclick = () => {
    const tot = document.querySelectorAll(".cotejo input").length, ok = marcados(), cot = Math.round(ok / tot * 100), res = est.res.slice();
    if (med || ok) {
      logSession("arg", { fid: m.id, eid: p.id, cot, ...(med ? { mul: med.mul, wpm: med.wpm, secs: med.secs, words: med.words, modo: "medido" } : { modo: "cotejo" }) });
      res.push({ n: p.n, cot, mul: med ? med.mul : null, final });
    } else res.push({ n: p.n, cot: null, mul: null, final });
    go("arg", { ...est, i: est.i + 1, res });
  };
  cleanup = () => turno.detener();
}

function argResumen(est, m) {
  const hechas = est.res.filter(r => r.cot != null);
  const completos = new Set(S.sessions.filter(s => s.type === "arg" && s.eid === "todo").map(s => s.fid));
  if (ARG.metodos.every(x => completos.has(x.id)) && !S.badges.arg4) { S.badges.arg4 = today(); save(); toast("🧩 ¡Logro desbloqueado! Cuatro maneras de tener razón"); }
  const sig = ARG.metodos.find(x => !completos.has(x.id));
  $("#app").innerHTML = `<div class="card"><p class="diag-paso">Construcción de argumentos</p><h2 class="diag-titulo">Argumento armado con ${esc(m.autor)}</h2>
    <p class="diag-lead">${hechas.length ? `Trabajaste <b>${hechas.length} de ${est.res.length}</b> pasos.` : "Recorriste el método sin registrar pasos."} Métodos completados: <b>${completos.size} de ${ARG.metodos.length}</b>.</p>
    ${est.res.map(r => `<div class="dg-fila"><span>${esc(r.n)}</span><b>${r.cot == null ? "—" : r.cot + "%"}${r.mul != null ? ` · ${r.mul} mul.` : ""}</b></div>`).join("")}
    ${sig ? `<button class="btn" id="j-otro">Ahora con ${esc(sig.autor)}</button>` : ""}
    <button class="btn sec" data-go="arg">Elegir otro método o asunto</button><button class="btn sec" data-go="hoy">Volver al inicio</button></div>`;
  if (sig) $("#j-otro").onclick = () => go("arg", { met: sig.id, caso: est.caso, i: 0, res: [] });
}
