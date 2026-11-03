// ====== UI ======
const $=s=>document.querySelector(s);
function toast(m){const d=document.createElement("div");d.className="toast";d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),3200)}
const TABS=[["hoy","🏠","Hoy"],["ej","🎤","Ejercicios"],["prog","📊","Progreso"],["logros","🏆","Logros"],["ajustes","⚙️","Ajustes"]];
let tab="hoy",cleanup=null;
function go(t,arg){if(cleanup){cleanup();cleanup=null}tab=t;renderNav();(VIEWS[t]||VIEWS.hoy)(arg);window.scrollTo(0,0)}
function renderNav(){const main=TABS.map(x=>x[0]);$("#nav").innerHTML=TABS.map(([id,i,l])=>`<button class="${(tab===id||(!main.includes(tab)&&id==="ej"))?"on":""}" onclick="go('${id}')"><i>${i}</i>${l}</button>`).join("")}
function greet(){const h=new Date().getHours();$("#greet").textContent=`${h<12?"Buenos días":h<19?"Buenas tardes":"Buenas noches"}, ${S.settings.name}`}

const STEPS=[["breath","Respiración diafragmática","3 min · base de la voz"],["voc","Vocalización y resonancia","2 min · escalas con vocales"],["art","Articulación","3 min · sílabas y trabalenguas"],["read","Lectura con ritmo","2 min · velocidad y pausas"],["impro","Improvisación","1 min · muletillas y fluidez"]];
const VIEWS={
hoy(){
  const r=routineDone(),n=Object.values(r).filter(Boolean).length,st=streak();
  $("#app").innerHTML=`
  <div class="card"><div class="stats">
    <div class="stat"><b>🔥 ${st}</b><span>días de racha</span></div>
    <div class="stat"><b>${n}/5</b><span>rutina de hoy</span></div>
    <div class="stat"><b>🧊 ${S.freezes}</b><span>comodines</span></div></div></div>
  <div class="card"><h2>Rutina diaria · ~11 min</h2>
    ${STEPS.map(([id,t,d])=>`<div class="step" onclick="go('${id}')"><div class="chk ${r[id]?"done":""}">${r[id]?"✓":""}</div><div class="t">${t}<small>${d}</small></div><span>›</span></div>`).join("")}
    ${n===5?`<p style="text-align:center">🎉 <b>Rutina completa.</b> Mañana más.</p>`:`<button class="btn" onclick="go('${STEPS.find(s=>!r[s[0]])[0]}')">${n?"Continuar":"Empezar"} rutina</button>`}
  </div>
  <div class="card"><h3>💡 Consejo del día</h3><p>${TIPS[new Date().getDate()%TIPS.length]}</p></div>`;
},
ej(){
  $("#app").innerHTML=`<div class="card"><h2>Ejercicios</h2>${STEPS.map(([id,t,d])=>`<div class="step" onclick="go('${id}')"><div class="t">${t}<small>${d}</small></div><span>›</span></div>`).join("")}</div>
  ${SR?"":`<div class="card"><b>⚠️ Tu navegador no tiene reconocimiento de voz.</b><p>Usa Chrome (Android/PC) o Safari actualizado para medir precisión y muletillas. Mientras, podrás grabarte y escucharte.</p></div>`}`;
},
breath(){
  let phase=0,cnt=0,cycles=0,iv,holdStart=0,L,raf;
  const P=[["Inhala por la nariz",4,1.35],["Sostén",4,1.35],["Exhala lento",6,.75]];
  $("#app").innerHTML=`<div class="card"><h2>🌬️ Respiración diafragmática</h2>
  <p>Mano en el abdomen: al inhalar se infla la panza, no el pecho. 6 ciclos 4–4–6.</p>
  <div class="circle" id="c"></div><div class="phase" id="ph">Listo</div><div class="timer" id="tm">—</div>
  <button class="btn" id="go">Iniciar ciclos</button></div>
  <div class="card"><h2>Exhalación sostenida “ssss”</h2><p>Inhala profundo y suelta el aire con una “s” suave y constante. Mide cuánto aguantas (meta: 25 s).</p>
  <div class="meter"><div id="lv"></div></div><div class="timer" id="hold">0.0 s</div>
  <button class="btn sec" id="hs">Empezar exhalación</button></div>`;
  $("#go").onclick=()=>{$("#go").disabled=true;cycles=0;phase=0;cnt=P[0][1];tick();iv=setInterval(()=>{cnt--;if(cnt<=0){phase=(phase+1)%3;if(phase===0)cycles++;if(cycles>=6){clearInterval(iv);$("#ph").textContent="¡Bien hecho!";$("#tm").textContent="✓";logSession("breath",{cycles:6,hold:0});return}cnt=P[phase][1]}tick()},1000)};
  function tick(){$("#ph").textContent=P[phase][0];$("#tm").textContent=cnt;$("#c").style.transitionDuration=P[phase][1]+"s";$("#c").style.transform=`scale(${P[phase][2]})`}
  $("#hs").onclick=async()=>{
    if(!L){L=new Listener();await L.start();holdStart=Date.now();$("#hs").textContent="Terminé";$("#hs").className="btn rec";
      const loop=()=>{$("#lv").style.width=(L.level()*100)+"%";$("#hold").textContent=((Date.now()-holdStart)/1000).toFixed(1)+" s";raf=requestAnimationFrame(loop)};loop()}
    else{cancelAnimationFrame(raf);const h=(Date.now()-holdStart)/1000;await L.stop();L=null;$("#hs").textContent="Otra vez";$("#hs").className="btn sec";
      logSession("breath",{hold:Math.round(h*10)/10});toast(`Exhalación: ${h.toFixed(1)} s`)}};
  cleanup=()=>{clearInterval(iv);cancelAnimationFrame(raf);L&&L.stop()};
},
voc(){
  const seq=["Humming “mmm” con labios cerrados (siente vibrar la nariz) — 20 s","Sirena: “uuuu” de grave a agudo y de regreso — 3 veces","“Mi-me-ma-mo-mu” subiendo de tono en cada vocal","Vocales exageradas: A-E-I-O-U abriendo mucho la boca","Lectura solo de vocales: di “o-a-o-e-o-e-a-o” de una frase","Bostezo-suspiro: abre la garganta y suelta “aaah” relajado"];
  let i=0,t=20,iv;
  $("#app").innerHTML=`<div class="card"><h2>🎵 Vocalización y resonancia</h2><p>Ejercicios tomados del entrenamiento de canto: calientan las cuerdas vocales y proyectan la voz sin forzar la garganta.</p>
  <div class="target" id="v">${seq[0]}</div><div class="timer" id="tm">20</div><div class="meter"><div id="lv"></div></div>
  <div class="row"><button class="btn" id="go">Iniciar (2 min)</button></div></div>`;
  let L,raf;
  $("#go").onclick=async()=>{$("#go").disabled=true;try{L=new Listener();await L.start();const loop=()=>{$("#lv").style.width=(L.level()*100)+"%";raf=requestAnimationFrame(loop)};loop()}catch(_){L=null}
    iv=setInterval(()=>{t--;$("#tm").textContent=t;if(t<=0){i++;if(i>=seq.length){clearInterval(iv);cancelAnimationFrame(raf);L&&L.stop();$("#v").textContent="¡Voz caliente! 🔥";$("#tm").textContent="✓";logSession("voc",{});return}t=20;$("#v").textContent=seq[i]}},1000)};
  cleanup=()=>{clearInterval(iv);cancelAnimationFrame(raf);L&&L.stop()};
},
art(){
  const f=S.settings.focus,sil=SILABAS[f]||SILABAS.R;
  const done=S.sessions.filter(s=>s.type==="art"&&s.acc>=90).length;const maxLvl=done<5?1:done<15?2:3;
  const pool=TRABALENGUAS.filter(x=>x.n<=maxLvl);const tw=pool[Math.floor(Math.random()*pool.length)];
  $("#app").innerHTML=`<div class="card"><h2>👄 Articulación</h2><h3>1. Series silábicas (sonido: ${f})</h3>
  <p>Lee cada serie 3 veces, primero lento y exagerado, luego a velocidad normal. Tip: con un lápiz entre los dientes obligas a la lengua y labios a trabajar más.</p>
  ${sil.map(s=>`<div class="target" style="font-size:18px">${s}</div>`).join("")}</div>
  <div class="card"><h3>2. Trabalenguas · nivel ${tw.n} <span class="pill">${tw.f}</span></h3>
  <div class="target" id="tg">${tw.t}</div><div class="trans" id="tr"></div>
  <button class="btn" id="rb">🎙️ Grabar</button><div id="res"></div></div>`;
  recordFlow(tw.t,(r)=>{const ok=lcsMatch(tw.t,r.text);const acc=Math.round(ok.filter(Boolean).length/ok.length*100);
    const words=tw.t.split(" ");$("#tg").innerHTML=words.map((w,i)=>`<span class="${ok[i]?"w-ok":"w-bad"}">${w}</span>`).join(" ");
    logSession("art",{acc,level:tw.n,secs:r.secs});
    return `<div class="stats" style="margin-top:12px"><div class="stat"><b>${acc}%</b><span>precisión</span></div><div class="stat"><b>${r.secs.toFixed(1)}s</b><span>tiempo</span></div><div class="stat"><b>N${tw.n}</b><span>nivel</span></div></div>
    <p>${acc>=90?"Excelente. Ahora intenta más rápido sin perder claridad.":"Las palabras en rojo no se entendieron. Repite lento, exagerando cada sílaba."}</p>`});
},
read(){
  const txt=LECTURAS[Math.floor(Math.random()*LECTURAS.length)];
  $("#app").innerHTML=`<div class="card"><h2>📖 Lectura con ritmo</h2><p>Lee en voz alta como si hablaras ante un auditorio. Haz pausa en cada punto y coma. Ritmo ideal de orador: <b>130–160 palabras por minuto</b>.</p>
  <div class="target" id="tg">${txt}</div><div class="trans" id="tr"></div><button class="btn" id="rb">🎙️ Grabar</button><div id="res"></div></div>`;
  recordFlow(txt,(r)=>{const n=txt.split(/\s+/).length;const wpm=Math.round(n/(r.secs/60));const ok=lcsMatch(txt,r.text);const acc=r.text?Math.round(ok.filter(Boolean).length/ok.length*100):null;
    logSession("read",{wpm,acc,secs:r.secs});
    const msg=wpm>170?"Vas muy rápido: respira en cada pausa y deja que las ideas aterricen.":wpm<110?"Un poco lento: mantén la energía sin perder las pausas.":"¡Ritmo de orador! Así suena la seguridad.";
    return `<div class="stats" style="margin-top:12px"><div class="stat"><b>${wpm}</b><span>palabras/min</span></div><div class="stat"><b>${acc??"—"}${acc!=null?"%":""}</b><span>claridad</span></div><div class="stat"><b>${r.secs.toFixed(0)}s</b><span>duración</span></div></div><p>${msg}</p>`});
},
impro(){
  const tema=TEMAS[Math.floor(Math.random()*TEMAS.length)];
  $("#app").innerHTML=`<div class="card"><h2>💬 Improvisación (60 s)</h2><p>Habla un minuto del tema. Cuando sientas venir un “este…”, <b>haz silencio</b>: una pausa se escucha más segura que una muletilla.</p>
  <div class="target">${tema}</div><div class="timer" id="cd">60</div><div class="trans" id="tr"></div>
  <button class="btn" id="rb">🎙️ Empezar</button><div id="res"></div></div>`;
  let iv;
  recordFlow(null,(r)=>{clearInterval(iv);const words=r.text?r.text.split(/\s+/).length:0;const wpm=Math.round(words/(r.secs/60));const m=countMuletillas(r.text);
    logSession("impro",{wpm,mul:m.c,secs:r.secs});
    const lst=Object.entries(m.found).map(([k,v])=>`<span class="pill">${k} ×${v}</span>`).join("")||"Ninguna 👏";
    return `<div class="stats" style="margin-top:12px"><div class="stat"><b>${m.c}</b><span>muletillas</span></div><div class="stat"><b>${wpm}</b><span>palabras/min</span></div><div class="stat"><b>${r.secs.toFixed(0)}s</b><span>duración</span></div></div><p>${lst}</p>`},
    ()=>{let t=60;iv=setInterval(()=>{t--;$("#cd").textContent=t;if(t<=0){clearInterval(iv);$("#rb").click()}},1000)});
  cleanup=()=>clearInterval(iv);
},
prog(){
  const by=t=>S.sessions.filter(s=>s.type===t);
  const art=by("art"),read=by("read"),im=by("impro"),br=by("breath").filter(s=>s.hold);
  const avg=(a,k)=>a.length?Math.round(a.reduce((x,s)=>x+(s[k]||0),0)/a.length):"—";
  const last7=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return S.days[dayStr(d)]?"🟩":S.freezeUsed.includes(dayStr(d))?"🧊":"⬜"}).join(" ");
  $("#app").innerHTML=`<div class="card"><h2>Últimos 7 días</h2><p style="font-size:22px;text-align:center">${last7}</p>
  <div class="stats"><div class="stat"><b>${S.sessions.length}</b><span>ejercicios</span></div><div class="stat"><b>${Object.keys(S.days).length}</b><span>días practicados</span></div><div class="stat"><b>${improvement()>0?"−"+improvement()+"%":"—"}</b><span>muletillas vs inicio</span></div></div></div>
  ${chartCard("🎯 Precisión en trabalenguas (%)",art.map(s=>s.acc),0,100)}
  ${chartCard("💬 Muletillas por minuto",im.map(s=>+(s.mul/(s.secs/60)).toFixed(1)),0,null)}
  ${chartCard("⏱️ Palabras por minuto (lectura)",read.map(s=>s.wpm),60,220,[130,160])}
  ${chartCard("🌬️ Exhalación sostenida (s)",br.map(s=>s.hold),0,null)}
  <div class="card"><h3>Promedios</h3><p>Precisión: <b>${avg(art,"acc")}%</b> · Ritmo: <b>${avg(read,"wpm")} ppm</b> · Mejor exhalación: <b>${br.length?Math.max(...br.map(s=>s.hold)):"—"} s</b></p></div>`;
  document.querySelectorAll("canvas[data-v]").forEach(drawChart);
},
logros(){
  const got=BADGES.filter(b=>S.badges[b.id]).length;
  $("#app").innerHTML=`<div class="card"><h2>Logros · ${got}/${BADGES.length}</h2>${BADGES.map(b=>`<div class="badge ${S.badges[b.id]?"got":""}"><div class="e">${b.e}</div><div><b>${b.n}</b><small>${b.d}${S.badges[b.id]?" · "+S.badges[b.id]:""}</small></div></div>`).join("")}</div>
  <div class="card"><h3>🧊 Comodines: ${S.freezes}</h3><p>Ganas uno cada 7 días seguidos (máximo 2). Si un día no practicas, se usa solo y tu racha no se rompe.</p></div>`;
},
ajustes(){
  $("#app").innerHTML=`<div class="card"><h2>Ajustes</h2>
  <label>Tu nombre</label><input id="nm" value="${S.settings.name}">
  <label>Sonido a trabajar</label><select id="fc">${Object.keys(SILABAS).map(k=>`<option ${k===S.settings.focus?"selected":""}>${k}</option>`).join("")}</select>
  <label>Hora del recordatorio diario</label><input type="time" id="hr" value="${S.settings.hour}">
  <button class="btn" id="sv">Guardar</button></div>
  <div class="card"><h2>⏰ Recordatorio diario</h2><p>La forma más confiable: agrega un evento diario a tu calendario (funciona aunque la app esté cerrada).</p>
  <button class="btn" id="ics">Agregar a mi calendario</button>
  <button class="btn sec" id="nt">Activar notificaciones de la app</button></div>
  <div class="card"><h2>Datos</h2><p>Todo se guarda solo en este dispositivo.</p><button class="btn sec" id="ex">Exportar respaldo</button><button class="btn sec" id="im">Importar respaldo</button><input type="file" id="fi" class="hidden" accept=".json"></div>`;
  $("#sv").onclick=()=>{S.settings.name=$("#nm").value||"Odín";S.settings.focus=$("#fc").value;S.settings.hour=$("#hr").value;save();greet();toast("Guardado")};
  $("#ics").onclick=()=>{const [h,m]=$("#hr").value.split(":");const d=today().replace(/-/g,"");
    const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//VozClara//ES","BEGIN:VEVENT",`UID:vozclara-${Date.now()}`,`DTSTAMP:${d}T000000Z`,`DTSTART;TZID=America/Mexico_City:${d}T${h}${m}00`,"DURATION:PT15M","RRULE:FREQ=DAILY","SUMMARY:🎙️ Voz Clara: rutina de dicción","DESCRIPTION:11 minutos para hablar mejor.","BEGIN:VALARM","TRIGGER:PT0M","ACTION:DISPLAY","DESCRIPTION:Hora de tu rutina de dicción","END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n");
    dl(new Blob([ics],{type:"text/calendar"}),"voz-clara-recordatorio.ics")};
  $("#nt").onclick=async()=>{if(!("Notification"in window))return toast("Este navegador no soporta notificaciones");const p=await Notification.requestPermission();toast(p==="granted"?"Te avisaré al abrir la app si no has practicado":"Permiso denegado")};
  $("#ex").onclick=()=>dl(new Blob([JSON.stringify(S)],{type:"application/json"}),`voz-clara-respaldo-${today()}.json`);
  $("#im").onclick=()=>$("#fi").click();$("#fi").onchange=async e=>{try{Object.assign(S,JSON.parse(await e.target.files[0].text()));save();toast("Respaldo importado");go("hoy")}catch(_){toast("Archivo no válido")}};
}};
function dl(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click()}
function recordFlow(target,evaluate,onStart){
  let L=null;const rb=$("#rb");
  rb.onclick=async()=>{
    if(!L){L=new Listener(t=>$("#tr").textContent=t);try{await L.start()}catch(_){L=null;return}rb.textContent="⏹️ Detener";rb.className="btn rec";$("#res").innerHTML="";onStart&&onStart()}
    else{rb.disabled=true;const r=await L.stop();L=null;rb.disabled=false;rb.textContent="🔁 Otra vez";rb.className="btn sec";
      if(!r.text&&SR)toast("No escuché nada claro. Acércate al micrófono.");
      $("#res").innerHTML=evaluate(r)+`<h3>Escúchate</h3><audio controls src="${r.audio}" style="width:100%"></audio>`;}
  };
  cleanup=()=>{L&&L.stop()};
}
function chartCard(title,vals,min,max,band){return `<div class="card"><h3>${title}</h3>${vals.length<2?`<p class="sub">Necesitas al menos 2 sesiones para ver la gráfica.</p>`:`<canvas data-v="${vals.slice(-30).join(",")}" data-min="${min}" data-max="${max??""}" data-band="${band?band.join(","):""}"></canvas>`}</div>`}
function drawChart(c){
  const v=c.dataset.v.split(",").map(Number),dpr=devicePixelRatio||1,W=c.clientWidth,H=160;c.width=W*dpr;c.height=H*dpr;const x=c.getContext("2d");x.scale(dpr,dpr);
  const mn=+c.dataset.min,mx=c.dataset.max?+c.dataset.max:Math.max(...v)*1.2||1,P=24;
  const X=i=>P+i*(W-P*2)/(v.length-1),Y=y=>H-P-(Math.min(Math.max(y,mn),mx)-mn)/(mx-mn)*(H-P*2);
  const ink=getComputedStyle(document.body).color;x.font="11px system-ui";x.fillStyle=ink;x.globalAlpha=.6;x.fillText(mx.toFixed(0),2,P);x.fillText(mn,2,H-P);x.globalAlpha=1;
  if(c.dataset.band){const [a,b]=c.dataset.band.split(",").map(Number);x.fillStyle="#1f9d5522";x.fillRect(P,Y(b),W-P*2,Y(a)-Y(b))}
  x.strokeStyle="#2f7de1";x.lineWidth=2.5;x.beginPath();v.forEach((y,i)=>i?x.lineTo(X(i),Y(y)):x.moveTo(X(i),Y(y)));x.stroke();
  x.fillStyle="#2f7de1";v.forEach((y,i)=>{x.beginPath();x.arc(X(i),Y(y),3,0,7);x.fill()});
}
