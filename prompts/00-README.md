# Learn English — plan de migración en prompts

Ejecuta los prompts **en orden**, uno por sesión (o uno detrás de otro en la misma sesión). Cada prompt termina con
una verificación (`npm run build`, tests, validador) y un commit, así que puedes parar entre medias y retomarlo.

| # | Prompt | Resultado |
|---|--------|-----------|
| 01 | [Fundación Angular 22](01-angular-foundation.md) | Proyecto Angular 22 zoneless + signals, CLAUDE.md, esquema de datos v2, despliegue en GitHub Pages |
| 02 | [Diseño estilo Remotion + temas](02-design-system.md) | Sistema de diseño, modo claro/oscuro, ajustes de usuario, mobile-first, accesibilidad |
| 03 | [Motor de examen: Reading, Listening, progreso](03-exam-engine.md) | Pantallas de examen, TTS con voces, corrección, progreso en localStorage |
| 04 | [Speaking con transcripción en vivo](04-speaking.md) | Web Speech API en tiempo real, grabación en IndexedDB, temporizadores |
| 05 | [Writing con corrector](05-writing-checker.md) | Corrector ortográfico offline + errores típicos de hispanohablantes |
| 06 | [PDF y exportación](06-pdf-export.md) | Informe PDF rediseñado + ZIP |
| 07 | [Auditoría de exámenes e imágenes verificadas](07-audit-and-images.md) | Revisión de los 5 exámenes existentes, validador v2, imágenes reales con licencia |
| 08 | [Generación masiva con agentes](08-content-agents.md) | Muchos exámenes nuevos en paralelo, por formato B1 |
| 09 | [QA final y publicación](09-qa-release.md) | Tests e2e, Lighthouse, accesibilidad, despliegue |

Notas:
- El contenido para el alumno (UI y exámenes) va en **inglés**; estos prompts están en español.
- Los prompts 03–06 dependen de 01–02. El 07 debe ir antes del 08 (el 08 usa el validador y las reglas de imágenes del 07).
- El 08 es el único que pide lanzar subagentes explícitamente.
