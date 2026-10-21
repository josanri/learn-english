# Prompt 08 — Generación masiva de exámenes con agentes en paralelo

```
Lee CLAUDE.md, docs/exam-formats.md, docs/audit-2026.md y el skill .claude/skills/b1-exam-author/.
Quiero muchos más exámenes B1. Usa subagentes en paralelo (te autorizo explícitamente; usa worktrees aislados si
te es útil) para generarlos, y tú haces de coordinador y revisor.

PLAN DE CONTENIDO (ajústalo si el doc de formatos lo aconseja)
- Cambridge B1 Preliminary: +10 exámenes (exam-06 … exam-15).
- EOI B1 (España): 6 exámenes (comprensión de textos escritos y orales, producción y coproducción escrita y
  oral, mediación).
- Trinity ISE I: 4 exámenes (Reading & Writing + Speaking & Listening).
- Aptis B1: 4. LanguageCert B1: 4. Oxford Test of English B1: 4.
- Opcional: 4 "Cambridge B1 Preliminary for Schools" etiquetados como tal, con temas adaptados a adolescentes.

ANTES DE LANZAR AGENTES
- Crea docs/content-plan.md con una tabla de asignación: examen → agente, tema, escenarios, nombres de personajes,
  temas de fotos y distribución de claves, de forma que NO se repitan entre agentes ni con los 5 existentes.
- Cada agente recibe: ruta del skill, su lista de exámenes, su fila de content-plan, el formato concreto, la
  carpeta destino src/assets/exams/b1/<board>/ y la orden de no tocar ningún otro archivo (index.json lo
  regeneras tú).

INSTRUCCIONES PARA CADA AGENTE
- Contenido 100% original (no copiar ni parafrasear exámenes oficiales ni textos con copyright), B1 real,
  inglés natural, explicaciones en todas las preguntas, guiones con turnos por speaker y voces variadas
  (en-GB, en-US, en-AU, en-IE), contentPoints en writing.
- Fotos reales con scripts/fetch-image.mjs, solo licencias de la lista blanca, mirando cada imagen antes de
  aceptarla.
- Al terminar cada examen: resolverlo a ciegas, `npm run validate:exams -- <archivo>` sin errores y sin avisos
  de distribución de claves, y entregar un resumen (tema, vocabulario cubierto, imágenes y licencias, dudas).
- Máximo 4–5 agentes simultáneos; agrupa varios exámenes por agente.

REVISIÓN (tú, después de cada agente)
- Lanza un agente revisor distinto del autor que resuelva el examen a ciegas y señale preguntas ambiguas,
  errores de nivel y problemas de imágenes; corrige lo que encuentre.
- Regenera index.json, ejecuta validate:exams sobre todo, lint, tests y build.
- Actualiza docs/content-plan.md con el estado y la cobertura de temas/vocabulario.
- Commit por lote de formato (un commit por board).
```
