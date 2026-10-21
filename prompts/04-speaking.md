# Prompt 04 — Speaking con transcripción en tiempo real

```
Lee CLAUDE.md y el SpeakingPanel/useSpeakingCapture de la versión React (en el historial git si ya se borró) para
conservar lo que funcionaba. Implementa la sección Speaking en Angular.

SPEECH RECOGNITION (API del navegador)
- SpeechRecognitionService con signals: status ('idle'|'listening'|'stopped'|'error'|'unsupported'),
  interimTranscript, finalTranscript, error. Usa SpeechRecognition/webkitSpeechRecognition con continuous=true e
  interimResults=true y lang de ajustes.
- Muestra el texto EN VIVO mientras se habla: texto final en color normal y el provisional (interim) atenuado y
  en cursiva, con aria-live="polite" limitado para no saturar lectores de pantalla.
- Si el navegador ofrece reconocimiento on-device (processLocally / SpeechRecognition.available/install en
  Chrome reciente), úsalo primero; si solo hay reconocimiento online, pídelo una vez y respeta el ajuste
  "permitir reconocimiento online". Detecta las capacidades con feature detection, no por user agent.
- Reinicio automático cuando Chrome corta la sesión ('end' inesperado) mientras el alumno sigue grabando.
- Firefox/sin soporte: estado 'unsupported' con mensaje claro; la grabación funciona igualmente y la
  transcripción se puede escribir a mano.

GRABACIÓN
- MediaRecorder en paralelo al reconocimiento (mismo getUserMedia), con formato soportado (webm/opus o mp4 en
  Safari). Guarda en IndexedDB por `${examId}:${attemptId}:${itemId}`; reproducir, regrabar y borrar.
- Visualizador de nivel de micrófono simple (AnalyserNode) para que el alumno vea que se le oye.
- Libera siempre el micrófono al salir de la pantalla (DestroyRef).

FLUJO POR PARTE (adaptable por formato con el registro de tipos del prompt 03)
- Part 1 interview: una pregunta cada vez, el examinador "habla" con TTS, el alumno responde.
- Part 2 photo: foto grande (con crédito visible), temporizador de 1 minuto, preparación opcional.
- Part 3 collaborative: rejilla de imágenes/ideas; como es individual, el alumno habla de todas y elige.
- Part 4 discussion: preguntas de seguimiento.
- Temporizadores por parte con cuenta atrás visible.

FEEDBACK ORIENTATIVO (NO es una nota oficial; dilo claramente en la UI)
- Por respuesta: duración, palabras, palabras por minuto, longitud media de frase, variedad léxica
  (type/token), conectores B1 usados (because, however, although, so, first of all…), muletillas detectadas
  ("eh", "um"), y lista de frases útiles que podría haber usado para esa parte.
- Edición manual de la transcripción (el reconocimiento se equivoca); la edición se guarda.

VERIFICACIÓN
- Tests del servicio con un mock de SpeechRecognition (eventos result/end/error) y del cálculo de métricas.
- Prueba manual en Chrome escritorio y Chrome Android (o explica qué no se pudo probar). Lint, build, commit.
```
