// ====== UI ======
const $ = s => document.querySelector(s);
function toast(m) {
  let box = $("#toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
  const d = document.createElement("div"); d.className = "toast"; d.textContent = m; box.appendChild(d);
  setTimeout(() => d.remove(), 3600);
}
const TABS = [["hoy", "🏠", "Hoy"], ["ej", "🎤", "Ejercicios"], ["prog", "📊", "Progreso"], ["logros", "🏆", "Logros"], ["ajustes", "⚙️", "Ajustes"]];
let tab = "hoy", cleanup = null;
function go(t, arg) {
  if (cleanup) { try { cleanup(); } catch (_) {} cleanup = null; }
  tab = VIEWS[t] ? t : "hoy"; renderNav(); VIEWS[tab](arg); window.scrollTo(0, 0);
}
function renderNav() {
  const main = TABS.map(x => x[0]);
  $("#nav").innerHTML = TABS.map(([id, i, l]) => `<button class="${(tab === id || (!main.includes(tab) && id === "ej")) ? "on" : ""}" onclick="go('${id}')" aria-label="${l}"><i aria-hidden="true">${i}</i>${l}</button>`).join("");
}
function greet() {
  const h = new Date().getHours(), s = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  $("#greet").textContent = S.settings.name ? `${s}, ${S.settings.name}` : s;
}
const pick = a => a[Math.floor(Math.random() * a.length)];

const STEPS = [["breath", "Respiración diafragmática", "3 min · base de la voz"], ["voc", "Vocalización y resonancia", "2 min · escalas con vocales"], ["art", "Articulación", "3 min · sílabas y trabalenguas"], ["read", "Lectura con ritmo", "2 min · velocidad y pausas"], ["impro", "Improvisación", "1 min · muletillas y fluidez"]];
const filaPaso = (id, t, d, chk) => `<button class="step" onclick="go('${id}')">${chk === undefined ? "" : `<span class="chk ${chk ? "done" : ""}" aria-hidden="true">${chk ? "✓" : ""}</span>`}<span class="t">${t}<small>${d}</small></span><span aria-hidden="true">›</span></button>`;

const VIEWS = {
  hoy() {
    const r = routineDone(), n = Object.values(r).filter(Boolean).length, st = streak();
    $("#app").innerHTML = `
    <div class="card"><div class="stats">
      <div class="stat"><b>🔥 ${st}</b><span>días de racha</span></div>
      <div class="stat"><b>${n}/${STEPS.length}</b><span>rutina de hoy</span></div>
      <div class="stat"><b>🧊 ${S.freezes}</b><span>comodines</span></div></div></div>
    <div class="card"><h2>Rutina diaria · ~11 min</h2>
      ${STEPS.map(([id, t, d]) => filaPaso(id, t, d, r[id])).join("")}
      ${n === STEPS.length ? `<p style="text-align:center">🎉 <b>Rutina completa.</b> Mañana más.</p>` : `<button class="btn" onclick="go('${STEPS.find(s => !r[s[0]])[0]}')">${n ? "Continuar" : "Empezar"} rutina</button>`}
    </div>
    <div class="card"><h3>💡 Consejo del día</h3><p>${TIPS[new Date().getDate() % TIPS.length]}</p></div>`;
  },
  ej() {
    const sr = srEstado();
    $("#app").innerHTML = `<div class="card"><h2>Ejercicios</h2>${STEPS.map(([id, t, d]) => filaPaso(id, t, d)).join("")}</div>
    ${sr === "ok" ? "" : `<div class="card aviso"><b>⚠️ La medición automática no está disponible aquí.</b><div>${srAyuda()}</div></div>`}`;
  },

  breath() {
    const P = [["Inhala por la nariz", 4, 1.35], ["Sostén", 4, 1.35], ["Exhala lento", 6, .75]];
    $("#app").innerHTML = `<div class="card"><h2>🌬️ Respiración diafragmática</h2>
    <p>Mano en el abdomen: al inhalar se infla la panza, no el pecho. 6 ciclos 4–4–6.</p>
    <div class="circle" id="c"></div><div class="phase" id="ph">Listo</div><div class="timer" id="tm">—</div>
    <button class="btn" id="go">Iniciar ciclos</button></div>
    <div class="card"><h2>Exhalación sostenida “ssss”</h2><p>Toca empezar, guarda silencio un instante y luego suelta el aire con una “s” suave y constante. El cronómetro corre solo mientras se escucha tu “s” (meta: 25 s).</p>
    <div class="meter"><div id="lv"></div></div><div class="timer" id="hold">0.0 s</div><div class="sub" id="hst" style="text-align:center"></div>
    <button class="btn sec" id="hs">Empezar exhalación</button></div>`;
    let iv = null, M = null, stop = null;
    $("#go").onclick = () => {
      $("#go").disabled = true; let fase = 0, ciclos = 0, finFase = Date.now() + P[0][1] * 1000;
      const pinta = () => { $("#ph").textContent = P[fase][0]; $("#c").style.transitionDuration = P[fase][1] + "s"; $("#c").style.transform = `scale(${P[fase][2]})`; };
      pinta();
      iv = setInterval(() => {
        let rest = Math.ceil((finFase - Date.now()) / 1000);
        if (rest <= 0) {
          fase = (fase + 1) % 3; if (fase === 0) ciclos++;
          if (ciclos >= 6) { clearInterval(iv); $("#ph").textContent = "¡Bien hecho!"; $("#tm").textContent = "✓"; $("#go").disabled = false; logSession("breath", { cycles: 6 }); return; }
          finFase = Date.now() + P[fase][1] * 1000; rest = P[fase][1]; pinta();
        }
        $("#tm").textContent = rest;
      }, 200);
    };
    const terminar = async () => {
      if (!M) return; stop && stop(); const m = M; M = null; await m.stop();
      const h = Math.round(acum * 10) / 10;
      $("#hs").textContent = "Otra vez"; $("#hs").className = "btn sec"; $("#hst").textContent = "";
      if (h >= 1) { logSession("breath", { hold: h }); toast(`Exhalación: ${h.toFixed(1)} s`); }
      else toast("No detecté la “s”. Acércate un poco al micrófono.");
    };
    let acum = 0;
    $("#hs").onclick = async () => {
      if (M) return terminar();
      M = new Medidor();
      try { await M.start(); } catch (_) { M = null; return; }
      $("#hs").textContent = "Terminé"; $("#hs").className = "btn rec"; $("#hst").textContent = "Silencio un instante…";
      const piso = []; let umbral = null, ultimo = performance.now(), sonando = false, empezo = false, silencio = 0; acum = 0;
      stop = bucle(() => {
        const db = M.db(), ahora = performance.now(), dt = (ahora - ultimo) / 1000; ultimo = ahora;
        $("#lv").style.width = (Math.max(0, Math.min(1, (db + 60) / 55)) * 100) + "%";
        if (umbral == null) { piso.push(db); if (piso.length > 30) { piso.sort((a, b) => a - b); umbral = Math.max(piso[15] + 10, -55); $("#hst").textContent = "Ahora: “ssss”…"; } return; }
        sonando = db > umbral;
        if (sonando) { empezo = true; acum += dt; silencio = 0; } else if (empezo) { silencio += dt; if (silencio > 1.2) terminar(); }
        $("#hold").textContent = acum.toFixed(1) + " s";
      });
    };
    cleanup = () => { clearInterval(iv); stop && stop(); M && M.stop(); M = null; };
  },

  voc() {
    const seq = ["Humming “mmm” con labios cerrados (siente vibrar la nariz) — 20 s", "Sirena: “uuuu” de grave a agudo y de regreso — 3 veces", "“Mi-me-ma-mo-mu” subiendo de tono en cada vocal", "Vocales exageradas: A-E-I-O-U abriendo mucho la boca", "Lectura solo de vocales: di “o-a-o-e-o-e-a-o” de una frase", "Bostezo-suspiro: abre la garganta y suelta “aaah” relajado"];
    $("#app").innerHTML = `<div class="card"><h2>🎵 Vocalización y resonancia</h2><p>Ejercicios tomados del entrenamiento de canto: calientan las cuerdas vocales y proyectan la voz sin forzar la garganta. El medidor solo usa el micrófono.</p>
    <div class="target" id="v">${seq[0]}</div><div class="timer" id="tm">20</div><div class="meter"><div id="lv"></div></div>
    <button class="btn" id="go">Iniciar (2 min)</button></div>`;
    let M = null, stopM = null, stopT = null;
    $("#go").onclick = async () => {
      $("#go").disabled = true; let i = 0;
      M = new Medidor();
      try { await M.start(); stopM = bucle(() => { $("#lv").style.width = (M.nivel() * 100) + "%"; }); } catch (_) { M = null; }
      const paso = () => {
        $("#v").textContent = seq[i];
        stopT = cuentaRegresiva(20, r => { $("#tm").textContent = r; }, () => {
          i++;
          if (i < seq.length) return paso();
          stopM && stopM(); M && M.stop(); M = null;
          $("#v").textContent = "¡Voz caliente! 🔥"; $("#tm").textContent = "✓"; logSession("voc", {});
        });
      };
      paso();
    };
    cleanup = () => { stopT && stopT(); stopM && stopM(); M && M.stop(); M = null; };
  },

  art() {
    const f = S.settings.focus, sil = SILABAS[f] || SILABAS.R;
    const done = S.sessions.filter(s => s.type === "art" && (s.acc >= 90 || s.self >= 4)).length; const maxLvl = done < 5 ? 1 : done < 15 ? 2 : 3;
    const pool = TRABALENGUAS.filter(x => x.n <= maxLvl); const tw = pick(pool);
    $("#app").innerHTML = `<div class="card"><h2>👄 Articulación</h2><h3>1. Series silábicas (sonido: ${esc(f)})</h3>
    <p>Lee cada serie 3 veces, primero lento y exagerado, luego a velocidad normal. Tip: con un lápiz entre los dientes obligas a la lengua y labios a trabajar más.</p>
    ${sil.map(s => `<div class="target" style="font-size:18px">${s}</div>`).join("")}</div>
    <div class="card"><h3>2. Trabalenguas · nivel ${tw.n} <span class="pill">${esc(tw.f)}</span></h3>
    <div class="target" id="tg">${esc(tw.t)}</div><div id="flujo"></div></div>`;
    const ctl = medirYEscuchar({
      el: $("#flujo"), tipo: "art", nivel: tw.n,
      evaluar: r => {
        const ok = lcsMatch(tw.t, r.text); const acc = Math.round(ok.filter(Boolean).length / ok.length * 100);
        let k = 0; $("#tg").innerHTML = palabrasVisibles(tw.t).map(p => { const bien = ok.slice(k, k + p.k).every(Boolean); k += p.k; return `<span class="${bien ? "w-ok" : "w-bad"}">${esc(p.w)}</span>`; }).join(" ");
        logSession("art", { acc, level: tw.n, secs: +(r.hablaSecs || r.secs).toFixed(1), modo: "medido", f: tw.f });
        return `<div class="stats" style="margin-top:12px"><div class="stat"><b>${acc}%</b><span>precisión</span></div><div class="stat"><b>${(r.hablaSecs || r.secs).toFixed(1)}s</b><span>tiempo</span></div><div class="stat"><b>N${tw.n}</b><span>nivel</span></div></div>
        <p>${acc >= 90 ? "Excelente. Ahora intenta más rápido sin perder claridad." : "Las palabras en rojo no se entendieron. Repite lento, exagerando cada sílaba."}</p>`;
      }
    });
    cleanup = () => ctl.detener();
  },

  read() {
    const txt = pick(LECTURAS);
    $("#app").innerHTML = `<div class="card"><h2>📖 Lectura con ritmo</h2><p>Lee en voz alta como si hablaras ante un auditorio. Haz pausa en cada punto y coma. Ritmo ideal de orador: <b>130–160 palabras por minuto</b>.</p>
    <div class="target" id="tg">${esc(txt)}</div><div id="flujo"></div></div>`;
    const ctl = medirYEscuchar({
      el: $("#flujo"), tipo: "read",
      evaluar: r => {
        const n = palabras(txt).length, dur = r.hablaSecs;
        const wpm = dur && dur >= 3 ? Math.round(n / (dur / 60)) : null;
        const ok = lcsMatch(txt, r.text); const acc = Math.round(ok.filter(Boolean).length / ok.length * 100);
        logSession("read", { wpm, acc, secs: dur ? +dur.toFixed(1) : null, modo: "medido" });
        const msg = wpm == null ? "No alcancé a medir tu velocidad: lee el texto completo." : wpm > 170 ? "Vas muy rápido: respira en cada pausa y deja que las ideas aterricen." : wpm < 110 ? "Un poco lento: mantén la energía sin perder las pausas." : "¡Ritmo de orador! Así suena la seguridad.";
        return `<div class="stats" style="margin-top:12px"><div class="stat"><b>${wpm ?? "—"}</b><span>palabras/min</span></div><div class="stat"><b>${acc}%</b><span>claridad</span></div><div class="stat"><b>${dur ? dur.toFixed(0) + "s" : "—"}</b><span>al hablar</span></div></div><p>${msg}</p>`;
      }
    });
    cleanup = () => ctl.detener();
  },

  impro() {
    const tema = pick(TEMAS), DUR = 60;
    $("#app").innerHTML = `<div class="card"><h2>💬 Improvisación (60 s)</h2><p>Habla un minuto del tema. Cuando sientas venir un “este…”, <b>haz silencio</b>: una pausa se escucha más segura que una muletilla.</p>
    <div class="target">${esc(tema)}</div><div class="timer" id="cd">${DUR}</div><div id="flujo"></div></div>`;
    let parar = null;
    const ctl = medirYEscuchar({
      el: $("#flujo"), tipo: "impro", etiquetaMedir: "Medir (empieza a hablar)",
      alIniciar: () => { parar = cuentaRegresiva(DUR, t => { const c = $("#cd"); if (c) c.textContent = t; }, () => ctl.terminar()); },
      alTerminar: () => { parar && parar(); parar = null; },
      evaluar: r => {
        const words = palabras(r.text).length, dur = r.hablaSecs || r.secs;
        const wpm = dur >= 5 ? Math.round(words / (dur / 60)) : null; const m = countMuletillas(r.segs);
        logSession("impro", { wpm, mul: m.c, words, secs: Math.round(dur), modo: "medido" });
        const lst = Object.entries(m.found).map(([k, v]) => `<span class="pill">${esc(k)} ×${v}</span>`).join("") || "Ninguna detectada 👏";
        return `<div class="stats" style="margin-top:12px"><div class="stat"><b>${m.c}</b><span>muletillas</span></div><div class="stat"><b>${wpm ?? "—"}</b><span>palabras/min</span></div><div class="stat"><b>${Math.round(dur)}s</b><span>duración</span></div></div><p>${lst}</p>
        <p class="sub">El reconocimiento a veces omite “eh” o “mmm”; toma este conteo como mínimo.</p>`;
      }
    });
    cleanup = () => { parar && parar(); ctl.detener(); };
  },

  prog() {
    const by = t => S.sessions.filter(s => s.type === t);
    const art = by("art").filter(s => s.acc != null), read = by("read").filter(s => s.wpm != null), im = by("impro").filter(s => s.mul != null && s.secs > 20), br = by("breath").filter(s => s.hold);
    const self = S.sessions.filter(s => s.self != null);
    const avg = (a, k) => a.length ? Math.round(a.reduce((x, s) => x + (s[k] || 0), 0) / a.length) : "—";
    const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return S.days[dayStr(d)] ? "🟩" : S.freezeUsed.includes(dayStr(d)) ? "🧊" : "⬜"; }).join(" ");
    $("#app").innerHTML = `<div class="card"><h2>Últimos 7 días</h2><p style="font-size:22px;text-align:center">${last7}</p>
    <div class="stats"><div class="stat"><b>${S.sessions.length}</b><span>ejercicios</span></div><div class="stat"><b>${Object.keys(S.days).length}</b><span>días practicados</span></div><div class="stat"><b>${improvement() > 0 ? "−" + improvement() + "%" : "—"}</b><span>muletillas vs inicio</span></div></div></div>
    ${chartCard("🎯 Precisión en trabalenguas (%)", art.map(s => s.acc), 0, 100)}
    ${chartCard("💬 Muletillas por minuto", im.map(s => +(s.mul / (s.secs / 60)).toFixed(1)), 0, null)}
    ${chartCard("⏱️ Palabras por minuto (lectura)", read.map(s => s.wpm), 60, 220, [130, 160])}
    ${chartCard("🌬️ Exhalación sostenida (s)", br.map(s => s.hold), 0, null)}
    ${chartCard("⭐ Autocalificación (1–5)", self.map(s => s.self), 1, 5)}
    <div class="card"><h3>Promedios</h3><p>Precisión: <b>${avg(art, "acc")}%</b> · Ritmo: <b>${avg(read, "wpm")} ppm</b> · Mejor exhalación: <b>${br.length ? Math.max(...br.map(s => s.hold)) : "—"} s</b></p></div>`;
    document.querySelectorAll("canvas[data-v]").forEach(drawChart);
  },
  logros() {
    const got = BADGES.filter(b => S.badges[b.id]).length;
    $("#app").innerHTML = `<div class="card"><h2>Logros · ${got}/${BADGES.length}</h2>${BADGES.map(b => `<div class="badge ${S.badges[b.id] ? "got" : ""}"><div class="e">${b.e}</div><div><b>${b.n}</b><small>${b.d}${S.badges[b.id] ? " · " + S.badges[b.id] : ""}</small></div></div>`).join("")}</div>
    <div class="card"><h3>🧊 Comodines: ${S.freezes}</h3><p>Ganas uno cada 7 días seguidos (máximo 2). Si un día no practicas, se usa solo y tu racha no se rompe.</p></div>`;
  },
  ajustes() {
    $("#app").innerHTML = `<div class="card"><h2>Ajustes</h2>
    <label for="nm">Tu nombre (opcional)</label><input id="nm" maxlength="40" value="${esc(S.settings.name)}" placeholder="¿Cómo quieres que te salude?">
    <label for="fc">Sonido a trabajar</label><select id="fc">${Object.keys(SILABAS).map(k => `<option ${k === S.settings.focus ? "selected" : ""}>${k}</option>`).join("")}</select>
    <label for="hr">Hora del recordatorio diario</label><input type="time" id="hr" value="${esc(S.settings.hour)}">
    <button class="btn" id="sv">Guardar</button></div>
    <div class="card"><h2>⏰ Recordatorio diario</h2><p>La forma más confiable: agrega un evento diario a tu calendario (funciona aunque la app esté cerrada).</p>
    <button class="btn" id="ics">Agregar a mi calendario</button>
    <button class="btn sec" id="nt">Activar notificaciones de la app</button></div>
    <div class="card"><h2>🔒 Datos y privacidad</h2>
    <p><b>Tu historial y tus grabaciones se quedan en este dispositivo.</b> No hay servidor de Voz Clara ni cuentas.</p>
    <p><b>Ojo:</b> cuando tocas <b>Medir</b>, el reconocimiento de voz lo hace el propio navegador, que envía el audio a servidores de <b>Google</b> (Chrome) o de <b>Apple</b> (Safari) para convertirlo en texto. <b>Escucharme</b> y los medidores no envían nada: el audio solo se procesa en tu teléfono.</p>
    <button class="btn sec" id="ex">Exportar respaldo</button><button class="btn sec" id="im">Importar respaldo</button><input type="file" id="fi" class="hidden" accept=".json,application/json">
    <div id="imp"></div></div>`;
    $("#sv").onclick = () => { S.settings.name = $("#nm").value.trim().slice(0, 40); S.settings.focus = $("#fc").value; S.settings.hour = $("#hr").value || "07:30"; save(); greet(); toast("Guardado"); };
    $("#ics").onclick = () => {
      const [h, m] = ($("#hr").value || "07:30").split(":"); const d = today().replace(/-/g, "");
      const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VozClara//ES", "BEGIN:VEVENT", `UID:vozclara-${Date.now()}`, `DTSTAMP:${d}T000000Z`, `DTSTART;TZID=America/Mexico_City:${d}T${h}${m}00`, "DURATION:PT15M", "RRULE:FREQ=DAILY", "SUMMARY:🎙️ Voz Clara: rutina de dicción", "DESCRIPTION:11 minutos para hablar mejor.", "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:Hora de tu rutina de dicción", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      dl(new Blob([ics], { type: "text/calendar" }), "voz-clara-recordatorio.ics");
    };
    $("#nt").onclick = async () => { if (!("Notification" in window)) return toast("Este navegador no soporta notificaciones"); const p = await Notification.requestPermission(); toast(p === "granted" ? "Te avisaré al abrir la app si no has practicado" : "Permiso denegado"); };
    $("#ex").onclick = () => dl(new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }), `voz-clara-respaldo-${today()}.json`);
    $("#im").onclick = () => $("#fi").click();
    $("#fi").onchange = async e => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      let obj; try { obj = JSON.parse(await f.text()); normalizar(obj); } catch (_) { return toast("Ese archivo no es un respaldo de Voz Clara."); }
      $("#imp").innerHTML = `<div class="aviso"><b>Respaldo con ${obj.sessions.length} ejercicios.</b> ¿Qué hago con él?
        <button class="btn" id="imc">Combinar con lo que ya tengo</button><button class="btn sec" id="imr">Reemplazar todo</button><button class="btn sec" id="imx">Cancelar</button></div>`;
      $("#imc").onclick = () => { if (importarRespaldo(obj, "combinar")) { toast("Respaldo combinado"); greet(); go("hoy"); } };
      $("#imr").onclick = () => { if (confirm("Se borrará tu historial actual y se usará el del respaldo. ¿Continuar?") && importarRespaldo(obj, "reemplazar")) { toast("Respaldo importado"); greet(); go("hoy"); } };
      $("#imx").onclick = () => { $("#imp").innerHTML = ""; };
    };
  }
};
function dl(blob, name) {
  const u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}
function chartCard(title, vals, min, max, band) { return `<div class="card"><h3>${title}</h3>${vals.length < 2 ? `<p class="sub">Necesitas al menos 2 sesiones para ver la gráfica.</p>` : `<canvas data-v="${vals.slice(-30).join(",")}" data-min="${min}" data-max="${max ?? ""}" data-band="${band ? band.join(",") : ""}" role="img" aria-label="${title}"></canvas>`}</div>`; }
function drawChart(c) {
  const v = c.dataset.v.split(",").map(Number), dpr = devicePixelRatio || 1, W = c.clientWidth, H = 160; c.width = W * dpr; c.height = H * dpr; const x = c.getContext("2d"); x.scale(dpr, dpr);
  const mn = +c.dataset.min; let mx = c.dataset.max ? +c.dataset.max : Math.max(...v) * 1.2 || 1; if (mx <= mn) mx = mn + 1; const P = 24;
  const X = i => P + i * (W - P * 2) / (v.length - 1), Y = y => H - P - (Math.min(Math.max(y, mn), mx) - mn) / (mx - mn) * (H - P * 2);
  const ink = getComputedStyle(document.body).color; x.font = "11px system-ui"; x.fillStyle = ink; x.globalAlpha = .6; x.fillText(mx.toFixed(0), 2, P); x.fillText(mn, 2, H - P); x.globalAlpha = 1;
  if (c.dataset.band) { const [a, b] = c.dataset.band.split(",").map(Number); x.fillStyle = "#1f9d5522"; x.fillRect(P, Y(b), W - P * 2, Y(a) - Y(b)); }
  x.strokeStyle = "#2f7de1"; x.lineWidth = 2.5; x.beginPath(); v.forEach((y, i) => i ? x.lineTo(X(i), Y(y)) : x.moveTo(X(i), Y(y))); x.stroke();
  x.fillStyle = "#2f7de1"; v.forEach((y, i) => { x.beginPath(); x.arc(X(i), Y(y), 3, 0, 7); x.fill(); });
}
