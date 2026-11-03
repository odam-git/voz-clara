// ====== Capa de audio ======
// Regla de la app: reconocimiento de voz y micrófono NUNCA al mismo tiempo.
//  - Reconocedor: solo reconocimiento (Medir). No abre el micrófono por su cuenta.
//  - Medidor: solo micrófono (nivel, dB, tono) y, si se pide, grabación (Escucharme).

const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const UA = navigator.userAgent;
const IS_IOS = /iP(hone|ad|od)/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_STANDALONE = navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
const IS_BRAVE = !!navigator.brave;
const IOS_OTRO_NAV = IS_IOS && /CriOS|FxiOS|EdgiOS|OPiOS/.test(UA);

// Estado del reconocimiento en este dispositivo (no se incluye en respaldos).
const ENV_KEY = "vozclara.dispositivo";
const ENV = (() => { try { return JSON.parse(localStorage.getItem(ENV_KEY)) || {}; } catch (_) { return {}; } })();
const saveEnv = () => { try { localStorage.setItem(ENV_KEY, JSON.stringify(ENV)); } catch (_) {} };
const modoApp = () => (IS_STANDALONE ? "instalada" : "navegador");

// Errores que no se arreglan reintentando en el momento.
const SR_FATAL = ["not-allowed", "service-not-allowed", "language-not-supported", "audio-capture"];

// "ok" | "sin" (el navegador no lo trae) | "falla" (lo trae pero aquí no funciona)
function srEstado() {
  if (!SR) return "sin";
  if (IS_BRAVE) return "falla";
  const f = ENV.srFalla && ENV.srFalla[modoApp()];
  return f ? "falla" : "ok";
}
function marcarFallaSR(error) {
  ENV.srFalla = ENV.srFalla || {};
  ENV.srFalla[modoApp()] = { error, fecha: today() };
  saveEnv();
}
function reintentarSR() { if (ENV.srFalla) delete ENV.srFalla[modoApp()]; saveEnv(); }
function marcarSRok() { if (ENV.srFalla && ENV.srFalla[modoApp()]) { delete ENV.srFalla[modoApp()]; saveEnv(); } }

// Explicación clara de por qué no mide y cómo lograr que sí mida.
function srAyuda() {
  const err = ENV.srFalla && ENV.srFalla[modoApp()] && ENV.srFalla[modoApp()].error;
  if (IS_BRAVE) return "Brave bloquea el reconocimiento de voz. Para medir, abre esta misma dirección en <b>Safari</b> (iPhone) o <b>Chrome</b> (Android/PC).";
  if (IOS_OTRO_NAV) return "En iPhone, este navegador no ofrece reconocimiento de voz. Abre esta dirección en <b>Safari</b> para medir.";
  if (!SR) return "Tu navegador no tiene reconocimiento de voz. Usa <b>Safari</b> (iPhone) o <b>Chrome</b> (Android/PC) para medir.";
  if (IS_IOS && IS_STANDALONE) return `En la app instalada en la pantalla de inicio, iOS no permitió el reconocimiento${err ? ` (<i>${esc(err)}</i>)` : ""}. Para que mida:
    <ol><li>Activa el dictado: <b>Ajustes › General › Teclado › Dictado</b> (y Siri, si lo pide).</li>
    <li>Vuelve aquí y toca <b>Reintentar medir</b>.</li>
    <li>Si sigue sin medir, abre la dirección de la app en <b>Safari</b>: ahí sí mide. Safari y la app instalada guardan historiales separados; júntalos con <b>Ajustes › Exportar</b> e <b>Importar › Combinar</b>.</li></ol>
    Mientras tanto, aquí puedes usar <b>Escucharme</b> y calificarte.`;
  if (err === "not-allowed") return "El permiso de micrófono o de reconocimiento de voz está bloqueado. Actívalo en los ajustes del sitio y toca <b>Reintentar medir</b>.";
  if (err === "service-not-allowed") return IS_IOS
    ? "iOS no permitió el reconocimiento. Activa <b>Ajustes › General › Teclado › Dictado</b> y toca <b>Reintentar medir</b>."
    : "El navegador no permitió el servicio de reconocimiento de voz. Revisa los permisos del sitio y toca <b>Reintentar medir</b>.";
  if (err === "audio-capture") return "Otra app está usando el micrófono. Ciérrala y toca <b>Reintentar medir</b>.";
  return "El reconocimiento de voz no funcionó en este dispositivo. Toca <b>Reintentar medir</b> o usa <b>Escucharme</b>.";
}

const MENSAJE_SR = {
  "no-speech": "No te escuché. Acércate al micrófono e intenta de nuevo.",
  "network": "El reconocimiento de voz necesita internet. Revisa tu conexión.",
  "aborted": "Se interrumpió la medición.",
};

class Reconocedor {
  constructor(onText) { this.onText = onText || (() => {}); }
  // Debe llamarse directo desde el toque del botón (iOS exige el gesto).
  start() {
    return new Promise((resolve, reject) => {
      const r = new SR();
      r.lang = "es-MX"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
      this.rec = r; this.segs = []; this.ses = []; this.interim = ""; this.err = null;
      this.tIni = performance.now(); this.tPrimero = null; this.tUltimo = null;
      this.activo = true; this.reinicios = 0; let iniciado = false;
      r.onstart = () => { if (!iniciado) { iniciado = true; resolve(); } };
      r.onresult = e => {
        const ahora = performance.now();
        if (this.tPrimero == null) this.tPrimero = ahora;
        this.tUltimo = ahora;
        // Se reconstruye todo en cada evento (evita duplicados de Safari).
        const fin = []; let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const x = e.results[i];
          if (x.isFinal) fin.push(x[0].transcript.trim()); else interim += x[0].transcript;
        }
        this.ses = fin; this.interim = interim.trim();
        this.onText(this.texto(true));
      };
      r.onerror = e => {
        this.err = e.error;
        if (!iniciado && SR_FATAL.includes(e.error)) { iniciado = true; reject(e.error); }
      };
      r.onend = () => {
        this._consolidar();
        const fatal = SR_FATAL.includes(this.err) || this.err === "network";
        if (this.activo && !fatal && this.reinicios < 30) {
          this.reinicios++;
          try { r.start(); return; } catch (_) {}
        }
        this.activo = false;
        if (!iniciado) { iniciado = true; reject(this.err || "sin-inicio"); }
        if (this._fin) this._fin();
      };
      try { r.start(); } catch (e) { reject("sin-inicio"); }
    });
  }
  _consolidar() {
    const nuevos = this.ses.length ? this.ses : (this.interim ? [this.interim] : []);
    for (const s of nuevos) {
      if (!s) continue;
      const prev = this.segs[this.segs.length - 1];
      if (prev && s.startsWith(prev)) this.segs[this.segs.length - 1] = s; // Safari a veces repite el segmento creciendo
      else if (s !== prev) this.segs.push(s);
    }
    this.ses = []; this.interim = "";
  }
  texto(conInterim) {
    const partes = [...this.segs, ...this.ses];
    if (conInterim && this.interim) partes.push(this.interim);
    return partes.join(" ").trim();
  }
  resultado() {
    const habla = this.tPrimero != null && this.tUltimo > this.tPrimero ? (this.tUltimo - this.tPrimero) / 1000 + 0.4 : null;
    return { text: this.texto(false), segs: this.segs.slice(), secs: (performance.now() - this.tIni) / 1000, hablaSecs: habla, error: this.err };
  }
  stop() {
    return new Promise(res => {
      let listo = false;
      const fin = () => { if (!listo) { listo = true; res(this.resultado()); } };
      if (!this.activo) { this._consolidar(); return fin(); }
      this._fin = fin; this.activo = false;
      try { this.rec.stop(); } catch (_) { this._consolidar(); fin(); }
      setTimeout(() => { this._consolidar(); fin(); }, 2500); // por si el navegador nunca avisa el final
    });
  }
  abort() { this.activo = false; try { this.rec && this.rec.abort(); } catch (_) {} }
}

// Detección de tono (YIN simplificado). Devuelve Hz o null si no hay voz.
function detectarTono(buf, sr) {
  const n = buf.length; let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  if (Math.sqrt(rms / n) < 0.01) return null;
  const minLag = Math.floor(sr / 1000), maxLag = Math.min(Math.floor(sr / 65), Math.floor(n / 2) - 1);
  const W = n - maxLag; const d = new Float32Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) { const x = buf[i] - buf[i + tau]; s += x * x; }
    d[tau] = s;
  }
  let acc = 0, tau = -1; const cm = new Float32Array(maxLag + 1); cm[0] = 1;
  for (let t = 1; t <= maxLag; t++) { acc += d[t]; cm[t] = acc ? d[t] * t / acc : 1; }
  for (let t = minLag; t <= maxLag; t++) {
    if (cm[t] < 0.15) { while (t + 1 <= maxLag && cm[t + 1] < cm[t]) t++; tau = t; break; }
  }
  if (tau < 0) return null;
  const a = cm[tau - 1] ?? cm[tau], b = cm[tau], c = cm[tau + 1] ?? cm[tau];
  const den = a - 2 * b + c; const shift = den ? (a - c) / (2 * den) : 0;
  return sr / (tau + shift);
}

const getUM = () => navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  ? navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }))
  : Promise.reject(new Error("sin-mic"));

let urlsAudio = [];
class Medidor {
  // opciones: { grabar: bool }
  async start(op = {}) {
    // El contexto de audio se crea durante el toque (iOS lo deja pausado si se crea después).
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = AC ? new AC() : null;
    try { this.ctx && this.ctx.resume && this.ctx.resume(); } catch (_) {}
    try { this.stream = await getUM(); }
    catch (e) { this._cerrarCtx(); toast("No pude usar el micrófono. Revisa los permisos del sitio."); throw e; }
    if (this.ctx) {
      try { await this.ctx.resume(); } catch (_) {}
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.an = this.ctx.createAnalyser(); this.an.fftSize = 2048; this.an.smoothingTimeConstant = 0;
      src.connect(this.an);
      this.buf = new Float32Array(this.an.fftSize);
      this.sr = this.ctx.sampleRate;
    }
    this.t0 = performance.now();
    if (op.grabar && window.MediaRecorder) {
      const tipos = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
      const tipo = tipos.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
      this.mr = new MediaRecorder(this.stream, tipo ? { mimeType: tipo } : undefined);
      this.chunks = []; this.mr.ondataavailable = e => e.data && e.data.size && this.chunks.push(e.data);
      this.mr.start(250);
    }
  }
  _leer() {
    if (!this.an) return null;
    if (this.an.getFloatTimeDomainData) this.an.getFloatTimeDomainData(this.buf);
    else { const b = new Uint8Array(this.an.fftSize); this.an.getByteTimeDomainData(b); for (let i = 0; i < b.length; i++) this.buf[i] = (b[i] - 128) / 128; }
    return this.buf;
  }
  // Nivel en dBFS (0 = máximo digital; la voz normal suele estar entre −40 y −20).
  db() {
    const b = this._leer(); if (!b) return -100;
    let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i];
    const rms = Math.sqrt(s / b.length);
    return rms > 0 ? Math.max(-100, 20 * Math.log10(rms)) : -100;
  }
  nivel() { return Math.max(0, Math.min(1, (this.db() + 60) / 55)); }
  tono() { const b = this._leer(); return b ? detectarTono(b, this.sr) : null; }
  segundos() { return (performance.now() - this.t0) / 1000; }
  _cerrarCtx() { try { this.ctx && this.ctx.state !== "closed" && this.ctx.close(); } catch (_) {} }
  stop() {
    const secs = this.t0 ? this.segundos() : 0;
    return new Promise(res => {
      const fin = () => {
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        this._cerrarCtx();
        let audio = null;
        if (this.chunks && this.chunks.length) {
          const blob = new Blob(this.chunks, { type: this.chunks[0].type || "audio/mp4" });
          urlsAudio.forEach(u => URL.revokeObjectURL(u)); urlsAudio = [];
          audio = URL.createObjectURL(blob); urlsAudio.push(audio);
        }
        this.stream = null; this.mr = null; this.chunks = null;
        res({ secs, audio });
      };
      if (this.mr && this.mr.state !== "inactive") { this.mr.onstop = fin; try { this.mr.stop(); } catch (_) { fin(); } }
      else fin();
    });
  }
}

// Bucle de animación con cancelación sencilla.
function bucle(fn) {
  let id = 0, vivo = true;
  const paso = () => { if (!vivo) return; fn(); id = requestAnimationFrame(paso); };
  id = requestAnimationFrame(paso);
  return () => { vivo = false; cancelAnimationFrame(id); };
}
