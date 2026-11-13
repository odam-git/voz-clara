// Prueba de humo en navegador (opcional; requiere Playwright):  node tests/humo.js
// Abre cada pantalla en modo claro y oscuro y falla si hay errores o violaciones de la política de seguridad.
const http = require("node:http"), fs = require("node:fs"), path = require("node:path");
const RAIZ = path.join(__dirname, ".."), TIPOS = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const servidor = http.createServer((req, res) => {
  const ruta = path.normalize(path.join(RAIZ, decodeURIComponent(req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0])));
  if (!ruta.startsWith(RAIZ) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(ruta)] || "application/octet-stream" }); fs.createReadStream(ruta).pipe(res);
});
(async () => {
  let chromium; try { ({ chromium } = require("playwright")); } catch (_) { console.log("Playwright no está instalado: se omite la prueba de humo."); return; }
  await new Promise(r => servidor.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${servidor.address().port}/`, errores = [];
  const nav = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  for (const colorScheme of ["light", "dark"]) {
    const p = await nav.newPage({ viewport: { width: 390, height: 844 }, colorScheme });
    p.on("pageerror", e => errores.push(`${colorScheme}: ${e.message}`));
    p.on("console", m => { if (m.type() === "error") errores.push(`${colorScheme}: ${m.text()}`); });
    await p.goto(url); await p.waitForSelector("#bv-go"); await p.click("#bv-go");
    for (const v of ["hoy", "ej", "breath", "voc", "art", "read", "impro", "vol", "ento", "pausa", "diag", "reporte", "prog", "logros", "ajustes"]) {
      await p.evaluate(v => go(v), v); await p.waitForTimeout(120);
      if (!(await p.locator("#app").innerText()).trim()) errores.push(`${colorScheme}: la pantalla "${v}" quedó vacía`);
    }
    await p.click('nav button[data-go="hoy"]');
    await p.close();
  }
  await nav.close(); servidor.close();
  if (errores.length) { console.error("FALLÓ:\n" + errores.join("\n")); process.exit(1); }
  console.log("Prueba de humo: todas las pantallas abren sin errores en modo claro y oscuro.");
})();
