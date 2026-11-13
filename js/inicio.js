// ====== Inicio ======
// Notificación por medio del service worker (único método que funciona en Android y en iPhone instalada).
async function notificar(titulo, cuerpo) {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 3000))]);
      if (reg && reg.showNotification) { await reg.showNotification(titulo, { body: cuerpo, icon: "icon-192.png", badge: "icon-192.png", tag: "vozclara-diaria" }); return true; }
    }
  } catch (_) {}
  try { new Notification(titulo, { body: cuerpo }); return true; } catch (_) { return false; }
}

// Al volver a la app: si cambió el día se aplican comodines y se refresca "Hoy";
// si se cortó el audio por salir, se reinicia la pantalla actual para que no quede a medias.
let diaVisto = today();
function alVolver(porAudio) {
  if (!S.onboarded) return;
  const cambioDia = diaVisto !== today(); diaVisto = today();
  if (cambioDia) applyFreezes();
  if (porAudio || (cambioDia && tab === "hoy")) go(tab === "diag" ? "hoy" : tab);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) alVolver(false); });

function arrancar() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (avisoInicio) setTimeout(() => toast(avisoInicio), 0);
  if (!S.onboarded) { go("bienvenida"); return; }
  applyFreezes(); greet(); go("hoy");
  if ("Notification" in window && Notification.permission === "granted" && !S.days[today()]) {
    const [h, m] = S.settings.hour.split(":").map(Number), n = new Date();
    if (n.getHours() * 60 + n.getMinutes() >= h * 60 + m && S.lastNotif !== today()) {
      S.lastNotif = today(); save();
      notificar("Voz Clara", "Tu rutina de hoy te espera: son unos minutos 🎙️");
    }
  }
}
cargarDatos().then(arrancar).catch(() => {
  $("#app").innerHTML = `<div class="card aviso"><h2>No se pudo cargar el contenido</h2><p>Abre Voz Clara desde su dirección web (por ejemplo, GitHub Pages) y con conexión la primera vez. Después funciona sin internet.</p><button class="btn" id="recargar">Reintentar</button></div>`;
  $("#recargar").onclick = () => location.reload();
});
