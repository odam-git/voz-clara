# Voz Clara

App personal para entrenar dicción, voz y oratoria: ejercicios diarios, medición de avances, rachas y recordatorios.

## Rutina diaria (~11 min)
1. **Respiración diafragmática**: ciclos 4–4–6 y exhalación sostenida “ssss” cronometrada.
2. **Vocalización y resonancia**: ejercicios de canto (humming, sirenas, escalas con vocales).
3. **Articulación**: series silábicas por sonido y trabalenguas con nivel progresivo; mide la precisión palabra por palabra.
4. **Lectura con ritmo**: mide palabras por minuto (meta 130–160) y claridad.
5. **Improvisación (60 s)**: cuenta muletillas y velocidad.

## Motivación
- Racha diaria con **comodines** (1 por cada 7 días, máx. 2) para que un día perdido no la rompa.
- 12 logros basados en mejora real, no solo en constancia.
- Gráficas de precisión, muletillas/min, ritmo y capacidad pulmonar.
- Recordatorio diario vía evento de calendario (.ics) y notificación al abrir la app.

## Uso
Es una PWA de un solo archivo, sin servidor. Publícala con GitHub Pages (Settings → Pages → rama `main`) y ábrela en Chrome o Safari; luego “Agregar a pantalla de inicio”.
El reconocimiento de voz usa la Web Speech API (`es-MX`): funciona mejor en Chrome. Los datos se guardan solo en el dispositivo.
