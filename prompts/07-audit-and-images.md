# Prompt 07 — Auditoría de los exámenes existentes e imágenes reales verificadas

```
Lee CLAUDE.md y el skill de autoría de exámenes. Antes de generar contenido nuevo, deja impecables los 5
exámenes que ya existen y prepara las reglas que usarán los agentes del prompt 08.

1. VALIDADOR v2 (scripts/validate-exams.mjs o .ts)
   - Reglas estructurales por formato (board): número de partes, nº de ítems por parte, tipos permitidos,
     rangos de palabras. Empieza por cambridge-pet (las reglas actuales) y define las de EOI, Trinity ISE I,
     Aptis, LanguageCert y Oxford Test of English B1 a partir de sus especificaciones públicas oficiales
     (busca en la web y cita la URL de cada spec en un comentario y en docs/exam-formats.md).
   - Reglas de calidad automáticas: ids únicos globales, índice de respuesta válido, distribución de claves
     (que la respuesta correcta no sea siempre la misma letra; avisa si una letra > 45%), longitud de la opción
     correcta vs distractores (avisa si es sistemáticamente la más larga), palabra clave del enunciado repetida
     solo en la clave, gaps de open cloze de una sola palabra, que cada respuesta de listening aparezca o se
     parafrasee en el guion, nombres/temas repetidos entre exámenes, vocabulario fuera de B1 (contraste con la
     Cambridge B1 Preliminary Vocabulary List; marca como aviso, no error).
   - Reglas de imágenes (ver punto 3). Salida con errores (bloquean CI) y avisos.

2. AUDITORÍA HUMANA DE LOS 5 EXÁMENES
   - Resuelve tú cada examen como si fueras un candidato, sin mirar la clave, y compara. Cualquier pregunta con
     más de una respuesta defendible, o sin respuesta recuperable del texto/guion, se reescribe.
   - Revisa naturalidad del inglés, nivel B1, explicaciones en todas las preguntas (añádelas si faltan),
     guiones de listening con turnos por speaker y voces distintas, `contentPoints` en writing.
   - Produce docs/audit-2026.md con una tabla: examen, parte, problema, cambio aplicado.

3. IMÁGENES REALES VERIFICADAS
   - Sustituye las ilustraciones por `scene` del Speaking por fotografías reales sacadas de internet SOLO de
     fuentes con licencia que permita reutilización: Wikimedia Commons (CC0, CC BY, CC BY-SA, dominio público),
     Unsplash o Pexels (licencias propias que permiten uso). Nada de Google Images ni fotos sin licencia clara.
   - Script scripts/fetch-image.mjs <sourceUrl> que: consulta la API (Commons: imageinfo con extmetadata;
     Unsplash/Pexels: su API o la página), comprueba la licencia contra una lista blanca, descarga una versión
     redimensionada, la convierte a WebP/AVIF (sharp) a 1200px y 600px, la guarda en
     src/assets/images/exams/<examId>/ y escribe credit { author, license, licenseUrl, sourceUrl } y un `alt`
     inicial en el JSON. Las imágenes se sirven desde el propio sitio (no hotlinking).
   - "Verificada" significa: licencia comprobada por el script + revisión visual tuya de que la foto encaja con
     la tarea (personas, lugar, actividad describibles con vocabulario B1, sin texto/marcas dominantes, sin
     menores identificables, sin contenido sensible). Mira cada imagen descargada antes de aceptarla.
   - Escribe un `alt` útil y un campo `describeHints` (3–5 cosas que se pueden describir) para cada foto.
   - El validador falla si una imagen no tiene archivo, credit completo, licencia de la lista blanca o alt.
   - Página /credits en la app que lista todas las imágenes con autor y licencia (exigencia de CC BY/BY-SA).
   - Reading Part 1 (notices) puede incluir imagen de cartel si añade valor, siguiendo las mismas reglas.

4. ACTUALIZA EL SKILL
   - Pasa el skill a .claude/skills/b1-exam-author/ con: esquema v2, un apartado por formato (board) con su
     estructura, las reglas de calidad, el flujo de imágenes con fetch-image, y una checklist final
     "resolver el examen a ciegas → validar → revisar imágenes → registrar en index.json".

VERIFICACIÓN: validate:exams sin errores, build, revisar Speaking en la app con las fotos nuevas. Commit.
```
