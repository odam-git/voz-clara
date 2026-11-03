// ====== Registro, rachas y logros ======
function logSession(type,data){
  const s={type,date:today(),ts:Date.now(),...data};S.sessions.push(s);
  S.days[today()]=(S.days[today()]||0)+1;checkBadges();save();return s;
}
function streak(){
  // racha con comodines: un día sin práctica se cubre si hay comodín
  let n=0,d=new Date();if(!S.days[dayStr(d)])d.setDate(d.getDate()-1);
  for(;;){const k=dayStr(d);if(S.days[k]||S.freezeUsed.includes(k)){n++;d.setDate(d.getDate()-1)}else break}
  return n;
}
function applyFreezes(){
  // al abrir: si ayer no practicó y hay comodín, se usa automáticamente
  const y=new Date();y.setDate(y.getDate()-1);const k=dayStr(y),b=new Date(y);b.setDate(b.getDate()-1);
  const prevActive=S.days[dayStr(b)]||S.freezeUsed.includes(dayStr(b));
  if(!S.days[k]&&!S.freezeUsed.includes(k)&&prevActive&&S.freezes>0){S.freezes--;S.freezeUsed.push(k);save();toast("🧊 Usaste un comodín: tu racha sigue viva.")}
}
const BADGES=[
  {id:"first",e:"🎙️",n:"Primera palabra",d:"Completa tu primer ejercicio",f:()=>S.sessions.length>=1},
  {id:"routine",e:"✅",n:"Rutina completa",d:"Termina la rutina del día",f:()=>Object.values(routineDone()).every(Boolean)},
  {id:"s3",e:"🔥",n:"Constancia",d:"Racha de 3 días",f:()=>streak()>=3},
  {id:"s7",e:"🏅",n:"Una semana",d:"Racha de 7 días",f:()=>streak()>=7},
  {id:"s30",e:"🏆",n:"Hábito de orador",d:"Racha de 30 días",f:()=>streak()>=30},
  {id:"acc90",e:"🎯",n:"Precisión",d:"90% o más en un trabalenguas nivel 2+",f:()=>S.sessions.some(s=>s.type==="art"&&s.level>=2&&s.acc>=90)},
  {id:"acc100",e:"💎",n:"Dicción perfecta",d:"100% en un trabalenguas nivel 3",f:()=>S.sessions.some(s=>s.type==="art"&&s.level>=3&&s.acc>=100)},
  {id:"breath",e:"🌬️",n:"Pulmón de acero",d:"Exhalación sostenida de 25 s",f:()=>S.sessions.some(s=>s.type==="breath"&&s.hold>=25)},
  {id:"clean",e:"🧼",n:"Sin muletillas",d:"Improvisa 60 s con 0 muletillas (medido)",f:()=>S.sessions.some(s=>s.type==="impro"&&s.modo==="medido"&&s.secs>=55&&s.words>=60&&s.mul===0)},
  {id:"pace",e:"⏱️",n:"Ritmo de orador",d:"Lectura entre 130 y 160 ppm",f:()=>S.sessions.some(s=>s.type==="read"&&s.wpm>=130&&s.wpm<=160)},
  {id:"improve",e:"📈",n:"Mejora real",d:"Reduce 50% tus muletillas vs. tu primera semana",f:()=>improvement()>=50},
  {id:"s100",e:"👑",n:"Cien sesiones",d:"Acumula 100 ejercicios",f:()=>S.sessions.length>=100}
];
function improvement(){
  const im=S.sessions.filter(s=>s.type==="impro"&&s.mul!=null&&s.secs>20);if(im.length<6)return 0;
  const rate=a=>a.reduce((x,s)=>x+s.mul/(s.secs/60),0)/a.length;
  const first=rate(im.slice(0,3)),last=rate(im.slice(-3));if(!first)return 0;return Math.round((1-last/first)*100);
}
function checkBadges(){
  for(const b of BADGES){if(!S.badges[b.id]&&b.f()){S.badges[b.id]=today();toast(`${b.e} ¡Logro desbloqueado! ${b.n}`)}}
  // comodín ganado cada 7 días de racha (máx. 2)
  const st=streak();if(st>0&&st%7===0&&S.lastFreezeAt!==today()&&S.freezes<2){S.freezes++;S.lastFreezeAt=today();toast("🧊 Ganaste un comodín por 7 días seguidos.")}
}
function routineDone(){
  const t=S.sessions.filter(s=>s.date===today());
  return {breath:t.some(s=>s.type==="breath"),voc:t.some(s=>s.type==="voc"),art:t.some(s=>s.type==="art"),read:t.some(s=>s.type==="read"),impro:t.some(s=>s.type==="impro")};
}
