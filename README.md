# Voz Clara

App personal para entrenar dicción, voz y oratoria en español de México con **práctica deliberada**: ejercicios cortos, enfocados en subhabilidades concretas, con retroalimentación inmediata y medición objetiva del avance.

PWA sin servidor ni dependencias. Funciona en GitHub Pages y, después de la primera carga, sin conexión.

## Cómo se usa
1. **Bienvenida**: nombre opcional (se cambia en Ajustes). La app no trae datos de nadie.
2. **Diagnóstico (3 min)**: voz normal, lectura, un trabalenguas por grupo de sonidos e improvisación. Fija tu **línea base** y elige los sonidos a trabajar.
3. **Rutina diaria (~13 min)**: respiración, calentamiento de canto, articulación, lectura, improvisación y un **enfoque del día** que rota entre proyección, entonación y pausas.
4. **Reporte semanal**: tu semana contra la línea base, con lo que más avanzó y el siguiente enfoque.

## Medición en dos tiempos
- **Medir**: solo reconocimiento de voz (precisión, palabras por minuto, muletillas).
- **Escucharme**: solo grabación, para oírte. Nunca se usan los dos a la vez.
- Respiración, canto, proyección, entonación y pausas usan **solo el micrófono** (nivel, dB y tono), sin reconocimiento.
- Si el reconocimiento no está disponible (Brave, Chrome/Firefox en iPhone, app instalada en iPhone que lo bloquea), la app lo detecta, explica cómo lograr que mida y pide **autocalificación de 1 a 5 estrellas**, guardada aparte.

## Módulos
| Módulo | Qué mide |
|---|---|
| Articulación | Precisión palabra por palabra en 400 trabalenguas (10 grupos de sonidos × 3 niveles) |
| Lectura | Palabras por minuto (meta 130–160) y claridad en 30 textos: discursos de dominio público, juicio oral ficticio y oratoria |
| Improvisación | Muletillas por minuto (según contexto) y ritmo en 30 temas |
| Proyección | dB relativos a tu voz normal; meta +6 dB sostenidos 5 s sin pasar +12 dB |
| Entonación | Curva de tono al afirmar, preguntar y enfatizar la misma frase |
| Pausas | Silencios detectados y si caen antes de las ideas clave (‖) |
| Canto | Resonancia guiada, sirenas (rango en semitonos) y escala con afinador |

La dificultad **se adapta**: sube con 3 buenos resultados seguidos y se ajusta con 3 difíciles.

## Motivación sin culpa
Rachas con **comodines** (1 por cada 7 días, máx. 2, cubren varios días seguidos), 19 logros y recordatorio diario por calendario (.ics) o notificación al abrir la app.

## Datos y privacidad
- El historial y las grabaciones se quedan **solo en el dispositivo** (localStorage). Exportar e importar respaldo (combinar o reemplazar) en Ajustes.
- El **reconocimiento de voz** lo hace el navegador: Chrome envía el audio a Google y Safari a Apple. Los medidores y Escucharme no envían nada.

## iPhone
Instálala desde Safari con **Compartir › Agregar a pantalla de inicio**. Si en la app instalada no mide, activa **Ajustes › General › Teclado › Dictado**; si aún así no mide, úsala en Safari. Safari y la app instalada guardan historiales separados: júntalos con Exportar e Importar › Combinar.

## Estructura
- `index.html`: estructura y estilos.
- `js/`: lógica por módulos (estado, voz, análisis, flujo, progreso, adaptativo, vistas, módulos, diagnóstico, reporte, inicio).
- `data/`: contenido en JSON (trabalenguas, lecturas, temas, entonación, consejos).
- `sw.js`: funcionamiento sin conexión. Sube `VERSION` si cambias la lista de archivos.
