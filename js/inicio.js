// ====== Inicio ======
applyFreezes();greet();go("hoy");
if("Notification"in window&&Notification.permission==="granted"&&!S.days[today()]){const [h,m]=S.settings.hour.split(":").map(Number),n=new Date();if(n.getHours()*60+n.getMinutes()>=h*60+m)try{new Notification("Voz Clara",{body:"Aún no haces tu rutina de hoy. Son 11 minutos 🎙️"})}catch(_){}}
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
