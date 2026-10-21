# Prompt 06 — Informe PDF rediseñado y exportación

```
Lee CLAUDE.md y el antiguo src/lib/resultExport.ts (historial git) — generaba el PDF a mano con primitivas PDF y
fuentes estándar, sin acentos ni tipografía de marca. Sustitúyelo por un informe mucho mejor diseñado.

TECNOLOGÍA
- Usa pdfmake (o jsPDF + autotable si lo justificas) cargado con import() dinámico solo al exportar, con la
  fuente de la app (Inter Tight / la elegida en el prompt 02) y JetBrains Mono embebidas para que el PDF tenga la
  misma identidad visual y soporte Unicode completo.
- Mantén la exportación ZIP (exam.json, answers.json, results.pdf, grabaciones, README) con fflate o JSZip en
  vez del ZIP casero.

DISEÑO DEL PDF (A4, imprimible en blanco y negro sin perder información)
- Portada: "Learn English · B1", título del examen, formato (Cambridge/EOI/…), nombre del alumno (ajustes),
  fecha, intento nº, y un bloque grande de puntuación por destreza con barras/anillos dibujados en vectorial;
  trazo azul decorativo coherente con la web.
- Resumen: tabla por parte (aciertos/total, %), tiempo empleado, preguntas marcadas.
- Detalle por destreza: preguntas en tablas compactas con ✓/✗ como iconos y texto (no solo color), tu respuesta,
  respuesta correcta y explicación. Textos de reading en anexo opcional.
- Writing: enunciado, respuesta con numeración de líneas, recuento de palabras, lista de incidencias del
  corrector (prompt 05) y la autoevaluación de la rúbrica.
- Speaking: por pregunta, transcripción, duración, métricas del prompt 04 y miniatura de la foto con crédito.
- Cabecera y pie en cada página (examen, página X de Y, aviso "Original practice materials — not an official
  exam paper"). Saltos de página que no partan tarjetas.
- Opción "Answer sheet only" (versión corta) y "Full report".

VERIFICACIÓN
- Genera PDFs de ejemplo para un examen completo y otro vacío; revísalos convirtiendo páginas a imagen y
  mirándolas (o describe cómo comprobarlo). Comprueba tamaño de bundle: pdfmake no debe ir en el bundle inicial.
  Lint, tests, build, commit.
```
