---
name: basic-icon-designer
description: >-
  Strict design system, quality standard, automated SVG linter, and 56px visual review workflow
  for original basic vocabulary illustrations (`src/assets/images/basic/*.svg`), including classic
  emoji feelings, clean minimal flat people, silhouettes, objects, flags, and landmarks. Use
  whenever creating, redesigning, auditing, or fixing any basic vocabulary SVG icon.
---

# Basic Icon Designer (Strict 56 px Standard)

Every basic vocabulary icon renders inside a `4rem` (64 px) white tile at **`3.5rem` (56 px)**
(`src/app/features/basic-vocabulary/basic-word-list.ts`). At 56 px, `1` SVG unit in
`viewBox="0 0 48 48"` equals **`1.17` CSS pixels**. Any design that only looks readable at 2× zoom
is a failure.

Read [references/design-system.md](./references/design-system.md) for the exact pixel budget,
palette, and stroke rules, [references/category-playbooks.md](./references/category-playbooks.md)
for the required template of each topic category, and
[references/anti-patterns.md](./references/anti-patterns.md) before authoring or editing any SVG.

## Mandatory workflow

1. **Classify the word** using [references/category-playbooks.md](./references/category-playbooks.md):
   - Feelings & expressive personality traits (`serious`, `shy`, `quiet`, `nervous`, `impatient`, `rude`, `funny`, `sensitive`, `friendly`) → **Classic Emoji** (`r=16..18` round expressive face).
   - Abstract / behavioural personality traits (`talkative`, `lazy`, `selfish`, `polite`, `honest`, `patient`, `sociable`, `hard-working`, `kind`, `generous`, `clever`, etc.) → **Bold Single-Concept Metaphor** filling 75% of the canvas (NEVER shrink a tiny person into a corner beside a tiny prop).
   - Appearance, hair, face traits, jobs, and concrete human actions (bust) → **Clean Minimal Flat Bust** (`r=9.5` circle head, rounded arch shoulders, no ear/neck strokes).
   - Full-body height, build, or small action figures (head diameter `< 12` units) → **Clean Silhouette Figure** (ZERO eyes, mouth, nose, or eyebrows inside small heads).
   - Body parts → **Bold Close-up Anatomy** (never a tiny full-body doll with a dashed circle).
   - Family relations → **Gender-neutral faded silhouettes** for context relatives + 1 highlighted target + unambiguous tree lines.
   - Nationalities → **Official-ratio flag on pole + Clean Minimal Flat neutral bust** with zero collision.
   - Landscapes, nature, sky, weather scenes, and cities → **Framed Vignette Badge** (`42×42` `rx="7"` `<clipPath>` + layered 3-plane depth + tonal shading + ONE crisp outer `#2b3445` border; NEVER half-bordered naked-sky boxes).
   - Standalone objects, food, buildings, and prepositions → **Single bold focal subject** filling 70–85% of the `48×48` box.
2. **Draft the SVG** following every hard rule below and in `references/design-system.md`.
3. **Run the strict automated audit** on every touched icon:
   ```
   node .agents/skills/basic-icon-designer/scripts/audit-icons.mjs <icon1> <icon2> ...
   ```
   Fix **all errors** before continuing. Zero errors allowed.
4. **Render a dual-size visual proof** (actual **56 px** app tile + **112 px** 2× zoom) and inspect the PNG with `read_file`:
   ```
   node .agents/skills/basic-icon-designer/scripts/preview-icons.mjs <out.png> <icon1> <icon2> ...
   ```
   Judge legibility primarily on the **56 px** column. If a learner cannot identify the word in under 1 second at 56 px, simplify and redraw.
5. **Run repository checks**:
   ```
   npm run validate:practice
   npm run test:scripts
   npm run lint
   ```

## Non-negotiable hard rules

1. **Canvas and margin:** Exact `viewBox="0 0 48 48"`, `stroke="#2b3445"`, `stroke-linecap="round"`, `stroke-linejoin="round"`. Every path and stroke half-width must stay strictly inside `[1.5, 46.5]`.
2. **Single full-colour file:** Never create or reference `*-fill.svg`. Every icon is one self-contained SVG designed for a white (`#ffffff`) paper tile.
3. **The 12-unit face rule:** NEVER draw eyes, eyebrows, nose, or mouth inside a head smaller than `12` SVG units in diameter (`r < 6`). At 56 px, sub-12-unit faces turn into muddy black blobs. Use a clean smooth silhouette head instead.
4. **No heavy internal cage lines on people:** On standard busts (`r=9.5`), never draw sticking-out thick-outlined ears, outlined neck tubes, scoop-collar arcs, hook noses, or default pink cheek ovals.
5. **Strict z-order (painter's algorithm):**
   - Back hair ALWAYS before shirt/shoulders.
   - Animal ears ALWAYS before head fill+stroke.
   - Snowcaps, tongues, and inner container fills ALWAYS clipped inside their container (`<clipPath>`) and drawn BEFORE the container's outer outline stroke (never draw an unclipped fill over a dark border).
   - Boat hulls and swimming animals ALWAYS behind front water waves (zero white gaps between object and water).
   - Sky backgrounds ALWAYS extend behind horizon/sea/ground curves (zero white horizon strips).
6. **Zero floating objects:** Drinks, plates, furniture, buildings, and standing figures must rest solidly on their counter, table, plateau, or ground line.
7. **Alignment:** Roofs must sit flush on gables (no double-line gaps). Stripes and patterns must follow exact parallel offsets inside outlines. Checkmarks and badges must center inside their container.
8. **Contrast on dark fills:** Any foreground tool or detail overlapping dark fills (`#25272d`, `#1d3570`, `#2f3542`) MUST carry a light rim or contrast tone so its silhouette reads clearly at 56 px.
9. **Respectful & inclusive people:** Never assume a partner's or parent's gender on faded context relatives (`boyfriend`, `girlfriend`, `husband`, `wife`, `aunt`, `uncle`, `*-in-law`, `step*`). Show body builds with smooth, natural, continuous curves — never pasted boxes, beach-ball ovals, or caricatures.
10. **Unique IDs:** Any `<clipPath>`, `<mask>`, or `<linearGradient>` ID must include the icon filename slug (e.g. `id="clip-british"`, `id="scene-lake"`).
11. **Framed Vignette Discipline (Landscapes & Scenes):** Never draw an unstroked square sky box above a thick-bordered bottom rectangle. Always clip full-bleed scenes inside `<rect x="3" y="3" width="42" height="42" rx="7"/>`, use at least 3 depth planes (sky/atmosphere → unstroked tonal midground → crisp focal foreground), omit black strokes on distant/texture elements, and close with ONE clean `#2b3445` `stroke-width="2"` rounded outer frame.
