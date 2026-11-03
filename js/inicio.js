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

function arrancar() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (!S.onboarded) { go("bienvenida"); return; }
  applyFreezes(); greet(); go("hoy");
  if (avisoInicio) toast(avisoInicio);
  if ("Notification" in window && Notification.permission === "granted" && !S.days[today()]) {
    const [h, m] = S.settings.hour.split(":").map(Number), n = new Date();
    if (n.getHours() * 60 + n.getMinutes() >= h * 60 + m && S.lastNotif !== today()) {
      S.lastNotif = today(); save();
      notificar("Voz Clara", "Tu rutina de hoy te espera: son unos minutos 🎙️");
    }
  }
}
arrancar();
