# Prompt 05 — Writing con corrector ortográfico y de errores frecuentes

```
Lee CLAUDE.md. Implementa la sección Writing con un corrector que funcione 100% en el navegador (GitHub Pages,
sin backend ni claves de API).

EDITOR
- Textarea accesible (no contenteditable complejo) con una capa de resaltado sincronizada detrás (técnica de
  "highlight overlay"), o CSS Custom Highlight API donde exista con fallback. Debe funcionar en móvil.
- Contador de palabras en vivo con el rango objetivo del formato (p. ej. ~100 en Cambridge, el que marque cada
  tarea) y estado visual (corto / bien / largo). Autoguardado con debounce. Temporizador opcional.
- Para la tarea email, muestra el email de origen y las notas; para la opción Part 2 un selector article/story.
- Mantén el spellcheck nativo del navegador desactivable (spellcheck="true" + lang="en").

CORRECTOR (en un Web Worker para no bloquear la UI)
1) Ortografía: Hunspell en JS (nspell + dictionary-en o dictionary-en-gb según ajuste), cargado perezosamente
   como asset. Lista de excepciones con nombres propios del enunciado.
2) Errores frecuentes de hispanohablantes en B1, como reglas propias (regex + contexto), cada una con
   explicación corta en inglés sencillo y sugerencia. Mínimo 60 reglas, organizadas en un JSON de datos y con un
   test por regla (caso positivo y negativo). Ejemplos:
   - "informations/advices/furnitures/homeworks" (incontables), "a people", "people is"
   - "I am agree", "depend of", "explain me", "married with", "discuss about", "arrive to"
   - "make a photo / make a party", "say me", "since 3 years", "the last week" (cuando es last week),
     "I have 20 years", "he don't", "more better", "the most of", "actually" ≠ actualmente,
     "assist to" ≠ asistir, "sensible" ≠ sensitive, "carpet" ≠ carpeta, "constipated" ≠ resfriado
   - Falsos amigos, "is" omitido ("Is important to…"), sujeto omitido ("Is raining"), "the" con generales
     ("The life is…"), orden adjetivo-nombre, "for + infinitivo" ("for to learn"), "how is called…".
   - Puntuación: espacio antes de signos, i minúscula, falta de mayúscula inicial, "Dear X," y cierre de email.
3) Checklist de tarea: ¿cubre los puntos/notas del enunciado? (palabras clave por punto definidas en el JSON del
   examen; añade el campo `contentPoints` al esquema v2 si no existe y rellénalo en los 5 exámenes),
   saludo/despedida en emails, párrafos, conectores, tiempos verbales variados.
- Panel de sugerencias: lista agrupada (Spelling / Grammar / Vocabulary / Task), clic en una sugerencia lleva
  al texto y permite "Apply" o "Ignore". Nunca corrige solo.
- Rúbrica de autoevaluación con los 4 criterios Cambridge (Content, Communicative Achievement, Organisation,
  Language) en slider 0–5 que el alumno rellena; dejar claro que no es una nota oficial.
- Opcional, desactivado por defecto: LanguageTool público (api.languagetool.org) solo si el usuario lo activa en
  ajustes, avisando de que el texto se envía a un servicio externo.

VERIFICACIÓN
- Tests de reglas, del worker y del recuento de palabras. Prueba en móvil que el resaltado queda alineado al
  escribir, hacer scroll y con texto grande. Lint, build, commit.
```
