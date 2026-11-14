// Pruebas de la lógica de Voz Clara. Ejecutar con:  node --test tests/
const test = require("node:test"), assert = require("node:assert/strict");
const { cargar, dia } = require("./cargar");
const ses = (type, n, extra = {}) => ({ type, date: dia(n), ts: new Date(dia(n) + "T10:00:00").getTime() + Math.random(), ...extra });
const base = (sessions, extra = {}) => ({ sessions, freezes: 1, freezeUsed: [], badges: {}, settings: { name: "Ana", hour: "07:30", focus: "RR" }, ...extra });

test("los scripts cargan y el contenido está completo", () => {
  const a = cargar();
  assert.equal(a.ev("TRABALENGUAS.length"), 400);
  assert.equal(a.ev("LECTURAS.length"), 30);
  assert.equal(a.ev("TEMAS.length"), 30);
  assert.equal(a.ev("ORDEN_FON.every(f => TRABALENGUAS.filter(t => t.f === f).length === 40)"), true);
  assert.equal(a.ev("ORDEN_FON.every(f => [1,2,3].every(n => TRABALENGUAS.some(t => t.f === f && t.n === n)))"), true);
  assert.equal(a.ev("ENTONACION.every(e => e.base.toLowerCase().includes(e.enfasis))"), true);
});

test("sin datos previos no hay nombre de fábrica y se pide la bienvenida", () => {
  const a = cargar();
  assert.equal(a.ev("S.settings.name"), "");
  assert.equal(a.ev("S.onboarded"), false);
});

test("un respaldo malicioso no conserva HTML ni tipos inesperados", () => {
  const malo = '"><img src=x onerror=alert(1)>';
  const a = cargar();
  a.ctx.respaldo = base([
    { type: "art", date: dia(1), ts: 1, acc: malo, f: malo, tid: malo, level: "3" },
    { type: "art", date: dia(0), ts: 2, acc: 90, f: "RR", modo: "medido", extra: { x: malo }, __proto__: { a: 1 } },
    { type: malo, date: dia(0), ts: 3 }, { type: "read", date: "9999-99-99", ts: 4 }, { type: "read", date: dia(0), ts: "5" }
  ], { badges: { first: malo, s3: dia(0), [malo]: dia(0) }, baseline: { fon: { RR: malo, TR: 80, [malo]: 5 }, focos: [malo, "RR"], modo: malo },
       levels: { art: { RR: 99, constructor: 2 }, read: malo }, volBase: { db: malo }, lastReport: malo, settings: { name: malo, focus: "constructor", focusList: ["__proto__", "TR"], hour: "99:99" } });
  const d = a.ev("normalizar(respaldo)");
  const texto = JSON.stringify({ ...d, settings: { ...d.settings, name: "" } });
  assert.ok(!texto.includes("<img"), "queda HTML en los datos: " + texto);
  assert.equal(d.sessions.length, 2);
  assert.equal(d.sessions[0].acc, undefined);
  assert.equal(d.sessions[1].acc, 90);
  assert.deepEqual(Object.keys(d.badges), ["s3"]);
  assert.deepEqual({ ...d.baseline.fon }, { TR: 80 });
  assert.deepEqual([...d.baseline.focos], ["RR"]);
  assert.equal(d.levels.read, 1);
  assert.deepEqual({ ...d.levels.art }, {});
  assert.equal(d.volBase, undefined);
  assert.equal(d.settings.hour, "07:30");
  assert.equal(d.settings.focus, "RR");
  assert.deepEqual([...d.settings.focusList], ["TR"]);
  // El nombre sí se conserva (es texto libre) pero siempre se muestra escapado.
  assert.equal(a.ev(`esc(${JSON.stringify(malo)})`).includes("<"), false);
});

test("las gráficas nunca escriben texto del historial como HTML", () => {
  const a = cargar();
  const html = a.ev(`chartCard("x", ['"><img src=x onerror=alert(1)>', 90, 80], 0, 100)`);
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes('data-v="90,80"'));
});

test("un sonido inexistente o heredado no rompe la articulación", () => {
  const a = cargar({ guardado: base([ses("art", 0)], { settings: { name: "", focus: "constructor", focusList: ["toString"] } }) });
  assert.equal(a.ev("esFonema('constructor')"), false);
  assert.equal(a.ev("focoDeHoy()"), "RR");
});

test("datos dañados: se guarda copia y la app abre limpia", () => {
  const a = cargar({ guardado: "{roto" });
  assert.equal(a.ev("S.sessions.length"), 0);
  assert.ok(a.ev("avisoInicio").includes("dañados"));
  assert.ok([...a.almacen.keys()].some(k => k.startsWith("vozclara.v1.danado.")));
});

test("importar: combinar no duplica y reemplazar sustituye", () => {
  const s1 = ses("art", 1, { acc: 80 }), s2 = ses("read", 0, { wpm: 140, acc: 90 });
  const a = cargar({ guardado: base([s1]) });
  a.ctx.otro = base([s1, s2]);
  a.ev("importarRespaldo(otro, 'combinar')");
  assert.equal(a.ev("S.sessions.length"), 2);
  a.ctx.otro = base([s2]);
  a.ev("importarRespaldo(otro, 'reemplazar')");
  assert.equal(a.ev("S.sessions.length"), 1);
});

test("racha: cuenta días seguidos y no se rompe si hoy aún no se practica", () => {
  assert.equal(cargar({ guardado: base([ses("art", 3), ses("art", 2), ses("art", 1)]) }).ev("streak()"), 3);
  assert.equal(cargar({ guardado: base([ses("art", 2), ses("art", 1), ses("art", 0)]) }).ev("streak()"), 3);
  assert.equal(cargar({ guardado: base([ses("art", 5), ses("art", 4)]) }).ev("streak()"), 0);
});

test("comodines: cubren varios días si alcanzan; si no alcanzan no se gasta ninguno", () => {
  let a = cargar({ guardado: base([ses("art", 5), ses("art", 4), ses("art", 3)], { freezes: 2 }) });
  a.ev("applyFreezes()");
  assert.equal(a.ev("S.freezes"), 0);
  assert.deepEqual([...a.ev("S.freezeUsed")].sort(), [dia(2), dia(1)].sort());
  assert.equal(a.ev("streak()"), 5);
  a = cargar({ guardado: base([ses("art", 5), ses("art", 4), ses("art", 3)], { freezes: 1 }) });
  a.ev("applyFreezes(); applyFreezes()");
  assert.equal(a.ev("S.freezes"), 1);
  assert.equal(a.avisos().filter(m => m.includes("racha nueva")).length, 1, "el aviso sale una sola vez al día");
  assert.ok(!a.avisos().join(" ").match(/perdiste|fallaste|rompiste/i));
});

test("comodines: se aplican al practicar aunque la app no se haya reiniciado", () => {
  const a = cargar({ guardado: base([ses("art", 2), ses("art", 3)], { freezes: 1 }) });
  a.ev("logSession('breath', { cycles: 6 })");
  assert.equal(a.ev("streak()"), 4);
  assert.equal(a.ev("S.freezes"), 0);
});

test("racha con cambio de horario (día de 23 o 25 horas)", () => {
  const a = cargar({ ahora: "2026-03-09T12:00:00", guardado: { sessions: ["2026-03-07", "2026-03-08", "2026-03-09"].map((d, i) => ({ type: "art", date: d, ts: i + 1 })), settings: {} } });
  assert.equal(a.ev("streak()"), 3);
  assert.equal(a.ev("mejorRacha()"), 3);
});

test("comparación por palabra: acentos, puntuación y números", () => {
  const a = cargar();
  assert.deepEqual([...a.ev(`lcsMatch("Tres tristes tigres, ¡tragaban trigo!", "3 tristes tigres tragaban")`)], [true, true, true, true, false]);
  assert.equal(a.ev(`porcentaje(lcsMatch("Rápido ruedan los carros", "rapido ruedan los carros"))`), 100);
  assert.equal(a.ev(`porcentaje(lcsMatch("Hola mundo", ""))`), 0);
  assert.equal(a.ev(`numALetras(21)`), "veintiuno");
  assert.equal(a.ev(`numALetras(1500)`), "mil quinientos");
});

test("velocidad de lectura: solo cuenta lo leído y descarta tiempos imposibles", () => {
  const a = cargar();
  assert.equal(a.ev(`palabrasLeidas([true, true, false, true, false, false])`), 4);
  assert.equal(a.ev(`calcularWpm(70, 30)`), 140);
  assert.equal(a.ev(`calcularWpm(70, 1)`), null);
  assert.equal(a.ev(`calcularWpm(70, 4)`), null);
  assert.equal(a.ev(`calcularWpm(2, 30)`), null);
});

test("muletillas según contexto", () => {
  const a = cargar(), c = t => a.ev(`countMuletillas(${JSON.stringify(t)}).c`);
  assert.equal(c(["este proyecto es bueno"]), 0);
  assert.equal(c(["no sé, no quiero"]), 0);
  assert.equal(c(["yo creo que no"]), 0);
  assert.equal(c(["es la verdad"]), 0);
  assert.equal(c(["este eh o sea digamos"]), 4);
  assert.equal(c(["es importante no"]), 1);
  assert.equal(c(["bueno pues vamos a empezar"]), 2);
});

test("detección de tono en tonos sintéticos", () => {
  const a = cargar();
  for (const f of [90, 150, 220, 440]) {
    const hz = a.ev(`(() => { const sr = 48000, n = 2048, b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = .3 * Math.sin(2 * Math.PI * ${f} * i / sr) + .1 * Math.sin(4 * Math.PI * ${f} * i / sr); return detectarTono(b, sr); })()`);
    assert.ok(Math.abs(hz - f) < 1, `${f} Hz → ${hz}`);
  }
  assert.equal(a.ev(`detectarTono(new Float32Array(2048), 48000)`), null);
});

test("entonación: afirmar baja, preguntar sube, enfatizar realza", () => {
  const a = cargar();
  a.ev(`mk = g => [...Array(120)].map((_, i) => ({ t: i / 60, voz: true, db: -25, f0: 150 * Math.pow(2, g(i / 120) / 12) }))`);
  assert.equal(a.ev(`analizarEntonacion(mk(x => x > .8 ? (x - .8) * 20 : 0), "preguntar").ok`), true);
  assert.equal(a.ev(`analizarEntonacion(mk(x => x > .8 ? -(x - .8) * 20 : 0), "afirmar").ok`), true);
  assert.equal(a.ev(`analizarEntonacion(mk(x => x > .8 ? (x - .8) * 20 : 0), "afirmar").ok`), false);
  assert.equal(a.ev(`analizarEntonacion(mk(x => x > .4 && x < .6 ? 5 : 0), "enfatizar").ok`), true);
  assert.equal(a.ev(`analizarEntonacion(mk(x => 0), "enfatizar").ok`), false);
  assert.equal(a.ev(`analizarEntonacion([], "afirmar")`), null);
});

test("pausas: premia las que caen antes de la idea clave", () => {
  const a = cargar();
  a.ev(`fr = segs => { const o = []; for (let t = .6; t < 10; t += 1 / 60) o.push({ t, db: -25, voz: segs.some(([x, y]) => t >= x && t <= y) }); return o; }`);
  const bien = a.ev(`analizarPausas(fr([[.7, 3.1], [3.9, 6.3], [7, 9.4]]), [10, 20], 30)`);
  assert.deepEqual([...bien.aciertos], [true, true]);
  const sin = a.ev(`analizarPausas(fr([[.7, 9.4]]), [10, 20], 30)`);
  assert.deepEqual([...sin.aciertos], [false, false]);
  assert.equal(a.ev(`analizarPausas([], [10], 30)`), null);
});

test("progresión adaptativa: sube con 3 buenos y se ajusta con 3 difíciles", () => {
  let a = cargar({ guardado: base([]) });
  a.ev(`for (let i = 0; i < 3; i++) ajustarNivel("art", logSession("art", { acc: 95, f: "RR", level: 1, modo: "medido" }))`);
  assert.equal(a.ev(`nivelArt("RR")`), 2);
  assert.equal(a.ev(`nivelArt("TR")`), 1);
  a.ev(`fijarAhora("2026-03-10T12:05:00")`);
  a.ev(`for (let i = 0; i < 3; i++) ajustarNivel("art", logSession("art", { acc: 40, f: "RR", level: 2, modo: "medido" }))`);
  assert.equal(a.ev(`nivelArt("RR")`), 1);
  assert.ok(a.avisos().some(m => m.includes("ajusté el reto")));
});

test("logros: sin medición real no se otorga 'Sin muletillas'", () => {
  const a = cargar({ guardado: base([]) });
  a.ev(`logSession("impro", { self: 5, modo: "auto", secs: 60 })`);
  assert.equal(a.ev(`!!S.badges.clean`), false);
  a.ev(`logSession("impro", { mul: 0, words: 120, secs: 60, modo: "medido" })`);
  assert.equal(a.ev(`!!S.badges.clean`), true);
});

test("reporte semanal: compara con la línea base medida, nunca con estrellas", () => {
  const sesiones = [0, 1, 2].flatMap(n => [ses("art", n, { acc: 90, f: "RR", modo: "medido" }), ses("impro", n, { mul: 2, secs: 60, modo: "medido" })]);
  let a = cargar({ guardado: base(sesiones, { baseline: { ts: 1, modo: "medido", fon: { RR: 70, TR: 80 }, mulMin: 8 } }) });
  let r = a.ev("reporteSemanal()");
  assert.equal(r.filas.find(f => f.k === "acc").est, "mejor");
  assert.equal(r.filas.find(f => f.k === "mul").est, "mejor");
  assert.equal(r.sem.dias, 3);
  // Línea base antigua hecha con estrellas: no debe usarse como "precisión".
  a = cargar({ guardado: base(sesiones, { baseline: { ts: 1, modo: "auto", fon: { RR: 25, TR: 50 } } }) });
  assert.deepEqual({ ...a.ev("S.baseline.fon") }, {});
  assert.deepEqual({ ...a.ev("S.baseline.fonSelf") }, { RR: 2, TR: 3 });
  r = a.ev("reporteSemanal()");
  assert.equal(r.filas.find(f => f.k === "acc").ref, null);
});

test("audio: el registro central impide dos usos a la vez y se vacía al apagar", () => {
  const a = cargar();
  assert.equal(a.ev("AUDIO_ACTIVO.size"), 0);
  a.ev("AUDIO_ACTIVO.add({ cancelar() { this.x = 1; } }); apagarAudio()");
  assert.equal(a.ev("AUDIO_ACTIVO.size"), 0);
});

test("práctica jurídica: contenido completo y coherente", () => {
  const a = cargar();
  assert.equal(a.ev("JUR.audiencias.length"), 4);
  assert.equal(a.ev("ARG.metodos.length"), 4);
  // Cada etapa tiene guía, lista de cotejo y ejemplo para los mismos papeles, y solo usa campos que existen.
  assert.equal(a.ev(`JUR.audiencias.every(x => x.etapas.every(e => Object.keys(e.guia).every(r => JUR.materias[x.materia].roles[r] && e.cotejo[r].length && e.modelo[r])))`), true);
  assert.equal(a.ev(`JUR.audiencias.every(x => { const c = JUR.casos.find(k => k.id === x.caso); return x.etapas.every(e => [e.juez, ...Object.values(e.guia).flat(), ...Object.values(e.contra)].every(t => !rellenarTexto(t, c).includes("[falta"))); })`), true);
  assert.equal(a.ev(`ARG.metodos.every(m => JUR.casos.every(c => m.pasos.every(p => ARG.modelos[c.id][m.id][p.id])))`), true);
});

test("práctica jurídica: el guion se adapta al asunto del usuario y marca lo que falta", () => {
  const a = cargar();
  a.ctx.mio = { id: "C1", materia: "penal", titulo: "Mío", campos: { imputado: "J. P.", delito: "fraude" } };
  assert.equal(a.ev(`rellenarTexto("Formule imputación a {imputado} por {delito}.", mio)`), "Formule imputación a J. P. por fraude.");
  assert.equal(a.ev(`rellenarTexto("Narra el hecho: {hechos}.", mio)`), "Narra el hecho: [falta: hechos (qué, cuándo, dónde y cómo)].");
  assert.equal(a.ev(`rellenarTexto("{constructor} {__proto__} {noexiste}", mio)`), "[falta: constructor] [falta: __proto__] [falta: noexiste]");
});

test("práctica jurídica: los asuntos importados se limpian y nunca llegan como HTML", () => {
  const malo = '<img src=x onerror=alert(1)>';
  const a = cargar();
  a.ctx.r = { sessions: [], casos: [
    { id: "C1", materia: "penal", titulo: malo, campos: { imputado: malo, hechos: "x".repeat(5000), [malo]: "y", objeto: { a: 1 } } },
    { id: malo, materia: "penal", titulo: "t", campos: {} }, { id: "C3", materia: "penal", titulo: "   " }, "texto", null ] };
  const d = a.ev("normalizar(r)");
  assert.equal(d.casos.length, 1);
  assert.equal(d.casos[0].campos.hechos.length, 800);
  assert.deepEqual(Object.keys(d.casos[0].campos).sort(), ["hechos", "imputado"]);
  a.ctx.c = d.casos[0];
  assert.ok(!a.ev(`rellenar("Imputado: {imputado}", c)`).includes("<img"), "el texto del asunto se escapa al mostrarse");
  assert.equal(a.ev(`Array(30).fill(0).map((_, i) => ({ id: "C" + i, materia: "civil", titulo: "t" + i })).length && normalizar({ sessions: [], casos: Array(30).fill(0).map((_, i) => ({ id: "C" + i, materia: "civil", titulo: "t" + i })) }).casos.length`), 20);
});
