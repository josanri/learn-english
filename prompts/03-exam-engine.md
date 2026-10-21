# Prompt 03 — Motor de examen: Reading, Listening, resultados y progreso

```
Lee CLAUDE.md. Implementa el motor de examen genérico sobre el esquema v2, usando los componentes del sistema de
diseño. Writing y Speaking tienen prompts propios (04 y 05): aquí deja solo su navegación y un placeholder.

ARQUITECTURA
- ExamSessionStore (signal store por examen, provisto en la ruta del examen): exam (resource), answers,
  currentSection, currentPart, timers, status por sección; computed para progreso, preguntas respondidas,
  puntuación. Persiste en el StorageService con effect debounced. Al volver, retoma donde estaba.
- Un registro de renderizadores por `part.type` (mapa type → componente cargado con @defer o
  NgComponentOutlet) para que añadir un tipo nuevo sea añadir un componente y una entrada, sin tocar el motor.
- Puntuación pura en funciones testeables (scoring.ts): elección múltiple, matching, gaps con `accepted`
  (normaliza mayúsculas, apóstrofes tipográficos, espacios, guiones), true/false/not given, etc.
  Tests unitarios para cada tipo.

UX DEL EXAMEN (móvil primero)
- Cabecera de examen con sección actual, temporizador (opcional según ajustes, mono, avisos a 5 y 1 min sin ser
  intrusivo, aria-live polite) y botón de salir que guarda.
- Navegador de preguntas (paleta numerada: respondida / marcada para revisar / pendiente), en móvil en un
  bottom sheet. Botón "Flag for review".
- Reading: en escritorio texto y preguntas en dos columnas con scroll independiente; en móvil pestañas
  "Text / Questions". Matching accesible con selects o radio-cards, nunca solo drag & drop.
- Gapped text: selección por gap con opciones restantes visibles.
- Modo examen (ajuste): sin feedback hasta enviar. Modo práctica: botón "Check" por parte con explicación.
- Pantalla de envío con resumen de preguntas sin responder y confirmación integrada.

LISTENING (Web Speech API — speechSynthesis)
- AudioScriptPlayer: reproduce guiones turno a turno con la voz asignada a cada speaker (elige la mejor voz
  disponible por lang/género; respeta la voz y velocidad de ajustes como preferencia). Controles: play/pausa,
  repetir turno, barra de progreso por turnos, "Play twice" como en el examen real (contador de escuchas; en
  modo examen máximo 2).
- Maneja los fallos conocidos: getVoices() vacío hasta 'voiceschanged', Chrome que corta utterances largas
  (trocea por frases), pausa/reanudación en Safari iOS, ausencia total de TTS (muestra transcripción con aviso).
- Transcripción oculta por defecto; visible tras enviar o en modo práctica.

RESULTADOS
- /results: nota por destreza con ProgressRing, desglose por parte, cada pregunta con tu respuesta, la correcta
  y la explicación. Para Cambridge, muestra también una estimación orientativa en Cambridge English Scale
  marcada claramente como aproximada (o no la muestres si no hay base fiable; decide y justifícalo).
- Historial de intentos por examen (guardar intentos, no solo el último) y botón "Retry" que crea un intento
  nuevo sin borrar el anterior.

PROGRESO GLOBAL
- En /b1 y Home: exámenes completados, media por destreza, racha de días de práctica, último examen en curso con
  "Continue". Todo derivado con computed desde el storage.

ACCESIBILIDAD
- Cada pregunta es un fieldset con legend; radios nativos estilizados; navegación completa por teclado; foco
  gestionado al cambiar de parte; anuncios aria-live al comprobar respuestas.

VERIFICACIÓN
- Tests de scoring, del store y del registro de partes. Prueba manual en móvil (360px) y escritorio de un examen
  completo de reading y listening. Lint, build, commit.
```
