# Prompt 01 — Fundación Angular 22

```
Vamos a migrar este proyecto (hoy React 19 + Vite, "Northstar B1") a Angular y renombrarlo a "Learn English".
La primera sección de la app será "B1". Haz esta fase y nada más; las siguientes fases vendrán en otros prompts.

CONTEXTO A LEER PRIMERO
- README.md, src/types/exam.ts, src/types/session.ts, src/lib/persistence.ts, src/data/index.ts, un examen
  (src/data/exam-01.json), scripts/validate-exams.mjs y .cursor/skills/b1-preliminary-exam-author/.
- Los 5 exámenes JSON y los datos guardados en localStorage/IndexedDB son el activo del proyecto: no se pierden.

STACK (obligatorio)
- Angular 22 (comprueba con `npm view @angular/core version`; usa la última 22.x estable. Si 22 no existe aún,
  dímelo y usa la última estable).
- Zoneless: provideZonelessChangeDetection(), sin zone.js en polyfills ni en angular.json.
- Standalone components, ChangeDetectionStrategy.OnPush en todos, control flow nativo (@if/@for/@switch),
  input()/output()/model(), signal()/computed()/effect()/linkedSignal(), resource()/httpResource() para cargar
  los JSON. Nada de NgModules, nada de @Input/@Output decoradores, RxJS solo donde sea inevitable.
- inject() en vez de constructores con parámetros. Strict TypeScript + strictTemplates.
- Router con lazy loading por ruta (loadComponent) y withComponentInputBinding().
- Tests con el runner por defecto del CLI de Angular 22 (Vitest si es el default).
- ESLint (angular-eslint) + Prettier.

ESTRUCTURA PROPUESTA
src/app/
  core/        storage (LocalStorageService con versión de esquema + migraciones), settings, theme, speech, audio-db
  data/        exam catalogue service (carga perezosa de JSON desde /assets/exams/<level>/<board>/<id>.json + index.json)
  models/      tipos del examen v2
  features/
    home/          landing estilo Remotion (placeholder en esta fase)
    level/         /b1 → listado de formatos y exámenes
    exam/          /b1/:board/:examId/(reading|writing|listening|speaking|results)
    settings/      /settings
  shared/      componentes UI reutilizables (vacíos de momento)

ESQUEMA DE DATOS v2 (multi-formato)
- La app debe soportar "todos los exámenes B1 habituales". Modela un `ExamBoard`:
  'cambridge-pet' (B1 Preliminary), 'eoi' (Escuela Oficial de Idiomas, España), 'trinity-ise1', 'aptis-b1',
  'languagecert-b1', 'oxford-test-b1' (deja el tipo abierto para añadir más).
- Cada examen: { schemaVersion: 2, id, level: 'B1', board, title, subtitle, theme, estimatedMinutes,
  sections: Section[] }. Una Section tiene skill ('reading'|'writing'|'listening'|'speaking'|'mediation'),
  timeLimitMinutes y parts[]. Cada part tiene un `type` discriminado (unión discriminada TS) con los tipos actuales
  de reading/listening/speaking/writing + los que necesiten los otros formatos (true-false-notgiven,
  sentence-completion, gap-fill-word-bank, mediation-text, etc.). Documenta cada tipo con un comentario breve.
- Imágenes: { id, src (ruta local en assets), alt, credit: { author, license, licenseUrl, sourceUrl } }.
- Listening: speakers con { id, name, voice: { lang: 'en-GB'|'en-US'|..., gender?, rate?, pitch? } } y guiones
  con turnos por speaker (para poder usar voces distintas).
- Crea un script `scripts/migrate-v1-to-v2.mjs` que convierta los 5 exámenes actuales a v2 (board
  'cambridge-pet') y los deje en src/assets/exams/b1/cambridge-pet/. Las imágenes de speaking actuales son
  ilustraciones por `scene`; mantenlas de momento referenciándolas como `illustration: scene` (el prompt 07 las
  sustituirá por fotos reales).
- Genera `index.json` por nivel (metadatos ligeros para el listado) con un script, no a mano.
- Valida los JSON con un JSON Schema generado desde los tipos (p. ej. ts-json-schema-generator) o con zod;
  deja `npm run validate:exams` funcionando sobre v2 con las mismas reglas que el validador actual para
  cambridge-pet.

PERSISTENCIA
- Una única clave localStorage `learn-english:v1` con { schemaVersion, settings, progress: { [examId]: { answers,
  results, startedAt, updatedAt, sectionStatus } } }. Servicio basado en signals que escribe con un effect
  (debounced) y lee con try/catch.
- Migra automáticamente los datos de la clave antigua (mira src/constants/app.ts → STORAGE_KEY) y la base de
  IndexedDB de audio (AUDIO_DATABASE/AUDIO_STORE) para no perder progreso ni grabaciones.

GITHUB PAGES
- `ng build --base-href /<nombre-repo>/` configurable; usa withHashLocation() O copia index.html a 404.html en el
  build (elige 404.html + rutas limpias y explícalo).
- Workflow .github/workflows/deploy.yml: install, lint, test, validate:exams, build, deploy con
  actions/deploy-pages. Node LTS actual.
- PWA ligera opcional: @angular/pwa para que funcione offline en móvil (los exámenes son estáticos).

LIMPIEZA
- Elimina React, Vite, tsconfig de Vite y src/ antiguo SOLO después de que la migración de datos funcione.
- Actualiza README.md (en inglés) y crea CLAUDE.md con: stack, convenciones (signals, zoneless, OnPush, sin
  NgModules), estructura de carpetas, comandos, cómo añadir un examen y la regla "contenido para alumnos en
  inglés, materiales originales, no copiar exámenes oficiales". Mueve el skill de .cursor/skills a
  .claude/skills/ adaptándolo al esquema v2 (mantén también la copia de .cursor si quieres).

UI EN ESTA FASE
- Solo un shell mínimo y rutas que funcionen (listado de exámenes y una página de examen que muestre el JSON
  cargado). El diseño llega en el prompt 02. No inviertas tiempo en estilos.

VERIFICACIÓN Y CIERRE
- `npm run lint`, `npm test`, `npm run validate:exams`, `npm run build` deben pasar. Arranca `ng serve` y
  comprueba que /b1 lista los 5 exámenes y que un examen carga.
- Crea una rama `angular-migration` y haz commit. Resume qué tipos nuevos has añadido para otros formatos.
```
