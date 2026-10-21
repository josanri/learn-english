# Prompt 02 — Sistema de diseño estilo Remotion, temas y ajustes

> Adjunta la captura de remotion.dev junto con este prompt.

```
Lee CLAUDE.md. Ahora rediseñamos la app "Learn English" para que se parezca al estilo de la web actual de Remotion
(remotion.dev, adjunto captura), priorizando accesibilidad y móvil. Inspírate en el lenguaje visual; NO copies
su logo, textos, ilustraciones ni marca.

RASGOS VISUALES A REPRODUCIR
- Modo oscuro: fondo casi negro neutro (~#1c1c1c), texto blanco; modo claro: fondo blanco, texto casi negro.
- Titulares enormes y muy gruesos, tracking negativo, interlineado apretado (Remotion usa GT Planar; usa una
  alternativa libre de Google Fonts, p. ej. "Inter Tight" 800/900 o "Bricolage Grotesque", con fallback de
  sistema). Cuerpo en la misma familia a 400/500. Monoespaciada (JetBrains Mono) para "chips" de comando,
  temporizadores y contadores.
- Un trazo de pincel azul (#0b84f3 aprox.) en diagonal detrás del titular del hero, como SVG propio animado al
  cargar (stroke-dashoffset) y que respete prefers-reduced-motion.
- Botones "píldora" con borde de 2px, radio ~8px, sombra inferior sólida (efecto tecla: box-shadow 0 3px 0) que
  se hunde al pulsar (translateY). En oscuro: fondo gris oscuro, borde más claro. En claro: blanco con borde negro.
- Tarjetas ilustrativas con borde negro grueso (2–3px), radio grande y sombra sólida desplazada (no difusa),
  colores planos (azul, crema, verde, blanco) y ligera rotación como en las tarjetas del hero.
- Mucho aire, rejilla simple, secciones con títulos grandes en gris ("Make videos …" → aquí "Practise reading",
  "Practise listening"…).

TOKENS Y TEMAS
- Define design tokens como CSS custom properties en :root (claro) y [data-theme="dark"]; además
  @media (prefers-color-scheme: dark) cuando el ajuste sea "system". Tokens: bg, surface, surface-2, text,
  text-muted, border, accent (azul), success, warning, danger, focus-ring, shadow-solid, radius-*, space-*,
  font-display, font-body, font-mono, type scale fluida con clamp().
- Contraste WCAG 2.2 AA verificado en ambos temas (calcúlalo y lista los pares en un comentario o doc).
- ThemeService con signal `theme: 'light'|'dark'|'system'`, aplica data-theme en <html>, sin flash al cargar
  (script inline mínimo en index.html que lee localStorage antes de que arranque Angular).

AJUSTES DE USUARIO (/settings, guardados en localStorage vía el servicio del prompt 01)
- Tema (claro/oscuro/sistema), tamaño de texto (normal/grande/muy grande), reducir movimiento, alto contraste.
- Voz preferida para listening (lista de speechSynthesis.getVoices() en inglés), velocidad de audio (0.8–1.2).
- Idioma de reconocimiento de voz (en-GB / en-US), permitir reconocimiento online sí/no.
- Mostrar temporizador sí/no, modo examen (sin pistas/explicaciones hasta terminar) sí/no.
- Nombre del alumno (para el PDF). Botones "Exportar progreso (JSON)", "Importar progreso" y "Borrar todo"
  con confirmación integrada en la página (nada de confirm()).

COMPONENTES COMPARTIDOS (shared/ui)
- Button (variantes primary/secondary/ghost, tamaños), Chip/Command chip, Card, IllustratedCard, Badge,
  ProgressRing, ProgressBar, Tabs/SegmentedControl, Dialog (con <dialog> nativo y foco atrapado), Toast,
  SkipLink, Icon (SVG inline, sin librerías pesadas), EmptyState.
- Todos con signals inputs, OnPush, foco visible, objetivos táctiles ≥ 44px, aria correcto.

PANTALLAS A DISEÑAR EN ESTA FASE
- Home: hero "Learn English" con el trazo azul, subtítulo, chips ("B1", "Practice exams", "Works offline") y
  CTA "Start B1". Debajo, tarjetas ilustradas (SVG propios) por destreza, y un bloque de progreso global si
  hay datos.
- /b1: filtros por formato (Cambridge, EOI, Trinity, Aptis, LanguageCert, Oxford) con SegmentedControl, rejilla
  de tarjetas de examen con tema, duración, estado (no empezado / en curso / completado + nota) y ProgressRing.
- Shell: cabecera fija con logo tipográfico "Learn English", navegación, botón de tema; en móvil menú inferior o
  hamburguesa accesible. Respeta safe-area-inset en iOS.

MÓVIL
- Mobile-first, prueba a 360px, 400px, 768px, 1280px. Sin scroll horizontal. Tipografía fluida.

VERIFICACIÓN
- Lint, tests de ThemeService y SettingsService, build. Arranca la app y revisa ambas paletas y anchos
  (usa capturas si tienes navegador disponible). Ejecuta axe (p. ej. @axe-core/playwright o similar) en Home y /b1
  sin violaciones serias. Commit.

Investiga el estilo de remotion, no tiene que parecer igual, dale un estilo propio
```
