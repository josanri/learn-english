# Prompt 09 — QA final y publicación en GitHub Pages

```
Lee CLAUDE.md. Haz la pasada final de calidad de "Learn English" antes de publicar.

- Tests e2e con Playwright (Chromium, WebKit y emulación móvil Pixel 7 / iPhone 14): completar un examen de cada
  formato, recargar a mitad y retomar, cambiar de tema, exportar PDF y ZIP, importar/exportar progreso, borrar
  datos. Mockea speechSynthesis y SpeechRecognition donde haga falta.
- Accesibilidad: axe en todas las rutas en ambos temas, navegación solo con teclado, lector de pantalla
  (revisión de landmarks, headings y anuncios aria-live), zoom 200%, prefers-reduced-motion.
- Rendimiento: Lighthouse móvil ≥ 90 en Performance, Accessibility, Best Practices y SEO; bundle inicial pequeño
  (exámenes, pdfmake, diccionario y worker con carga perezosa); imágenes con width/height, loading="lazy" y
  srcset. Revisa que funciona offline (service worker) tras la primera visita.
- Robustez: localStorage lleno o bloqueado, IndexedDB no disponible, navegadores sin TTS o sin reconocimiento,
  JSON de progreso corrupto al importar.
- SEO/metadatos: títulos por ruta, meta description, Open Graph con imagen propia, manifest e iconos.
- Revisa que /credits incluye todas las imágenes y que el README explica el proyecto, cómo desplegar y la
  política de contenido original.
- Despliegue: verifica el workflow de GitHub Pages en una rama, que las rutas profundas funcionan al recargar
  (404.html) y que el base-href es correcto. No hagas push ni merge a main sin preguntarme.
- Entrega un informe final: qué se ha probado, resultados de Lighthouse/axe, limitaciones conocidas por
  navegador y lista de mejoras futuras.
```
