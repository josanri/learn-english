# Basic Icon Design System (56 px Pixel-Budget Spec)

## 1. Real-world display context

- Tile container: `.pic` = `4rem × 4rem` (`64 × 64` CSS px), background `--paper-white` (`#ffffff` in both light and dark themes), `border-radius: var(--radius)`.
- SVG element: `.art` = `3.5rem × 3.5rem` (`56 × 56` CSS px).
- Scale factor: **`1` SVG unit = `1.167` CSS px**.
- Consequence:
  - A `2` unit stroke renders as **`2.3 px`** (crisp primary outline).
  - A `1.4` unit stroke renders as **`1.6 px`** (secondary internal detail).
  - Anything smaller than `1.2` units (`< 1.4 px`) vanishes or anti-aliases into grey fuzz.
  - Two dark lines separated by `< 2.5` units (`< 3 px`) visually fuse into one muddy blob.

## 2. Geometry and stroke hierarchy

| Role                                | Stroke width                         | Notes                                                   |
| ----------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| Primary silhouette outline          | `2` (or `1.8` on dense scenes)       | Always `#2b3445`, round caps & joins                    |
| Secondary internal seam / detail    | `1.3` – `1.6`                        | Use darker shade of fill or `#2b3445` sparingly         |
| Emoji facial features (`r=18` face) | `2.0` – `2.4`                        | Bold so emotions read instantly at 56 px                |
| Dashed highlight ring               | `1.8`, `stroke-dasharray="3 2.5"`    | Colour `#3f6fd8`, never overlapping thick black strokes |
| Flag inner elements                 | `none` (or official clipped strokes) | Border `<rect>` at `stroke-width="1.4"`                 |

### Safe-zone & composition rules

- **Canvas:** `viewBox="0 0 48 48"`.
- **Safe margin:** Keep all outer geometry within `x, y ∈ [2.5, 45.5]` so `stroke-width="2"` (half-width `1.0`) never touches `0` or `48`.
- **Focal fill ratio:** Primary subject should span `30–40` units in its dominant dimension (`62–83%` of canvas). Never draw tiny floating icons surrounded by empty whitespace (unless isolation IS the meaning, e.g. `lonely`).
- **Element budget:** Aim for **6–18 SVG primitives** per icon (excluding official complex flags). If a non-flag icon needs `> 28` primitives, it is over-detailed for 56 px — simplify the silhouette.

## 3. Approved flat colour palette

Always pick flat fills from this shared mid-saturation palette (no neon, no muddy greys, no arbitrary random hexes):

- **Ink / outline:** `#2b3445`
- **Neutrals & surfaces:** `#ffffff`, `#eef1f5`, `#dde2e9`, `#d3dae4`, `#9aa3b2`, `#8590a2`, `#4a5263`, `#25272d`
- **Reds / corals:** `#e0453a` (shade `#be3b31`), `#d0553f`, `#f06c5b`, `#9b2c2c`
- **Oranges / yellows:** `#f08a24` (shade `#d4761c`), `#f6c431` (shade `#e0a91e`), `#e8b923`, `#fff1c2`
- **Greens / teals:** `#3fa55b` (shade `#368e4e`), `#7cc35a`, `#a8d45c`, `#2aa198` (shade `#238880`)
- **Blues:** `#cdeaf9` (sky), `#8fd0f5`, `#5bb4e8`, `#4aa3df` (water), `#3f6fd8` (shade `#365fba`), `#2f4a8a`, `#1d3570`
- **Purples / pinks:** `#8e5bd0` (shade `#784cb0`), `#ec7fa9` (shade `#c9628b`), `#f8c9da`
- **Warm creams / woods / earth:** `#f3e2c4`, `#e8d9b5`, `#d9a46a`, `#c98b4f`, `#9a5b34`, `#7c5230`
- **Skin tones (natural range):** `#fcefe6`, `#f9dec9`, `#f5cca8`, `#d9a173`, `#a8714a`, `#7a4e33`
- **Hair tones:** `#f0c85a` (blonde), `#c85a32` (red), `#8a5a34` (light brown), `#4a3122` (dark brown), `#2a2420` (black), `#b8bcc4` (grey)

## 4. Framed vignette & depth rules (Landscapes, Nature, Sky & Cities)

Full-bleed scenes (nature, sky, landscapes, cities) look cheap ("MS Paint") when they stack flat stroked rectangles on top of an unbordered blue square. Follow these 5 rules instead:

1. **Unified Clipped Badge:** Wrap all scene layers in `<clipPath id="scene-<name>"><rect x="3" y="3" width="42" height="42" rx="7"/></clipPath>` and finish with ONE crisp outer frame `<rect x="3" y="3" width="42" height="42" rx="7" fill="none" stroke="#2b3445" stroke-width="2"/>`. Never leave a naked unstroked sky half above a black-bordered ground half.
2. **Three Depth Planes:** Compose every scene with:
   - **Far sky / atmosphere:** Two-tone sky bands (or subtle horizon glow / soft sun halo), completely unstroked.
   - **Midground:** Rolling hills, distant mountains, far treeline, or clouds using **soft tonal colour fills with NO `#2b3445` stroke** so they recede naturally.
   - **Foreground focal subject:** Crisp bold subject (palm tree, cottage, sailboat, wave crest, crescent moon, golden star, river bend) with clean `#2b3445` `1.5–1.8` outlines or sharp tonal contrast.
3. **Organic Curves & Perspective:** Use smooth sweeping Bézier arcs (`Q` / `C`) for hills, shorelines, winding rivers, and crop rows — never rigid horizontal lines or jagged sawtooth triangles.
4. **Restrained Internal Strokes:** Never outline background texture lines (crop furrows, water shimmer, distant ridges, cloud shadows) in `#2b3445`. Use a slightly lighter or darker tone of the same hue instead.
5. **Atmospheric Polish:** Add 1–2 subtle unstroked highlights (sun/moon halo at `fill-opacity=".22"`, white water glints, soft cloud under-shadow) so the 56 px tile feels illustrated and alive without clutter.

## 5. Visual clarity checklist (before approving any icon)

1. **1-second test at 56 px:** Hide the word label. Can you name the concept immediately?
2. **Sibling differentiation:** Does this icon look visually distinct from its neighbours in the same group (e.g. `slim` vs `thin` vs `skinny`, `chips` vs `fried`, `cousin` vs `nephew`, `attic` vs `basement`)?
3. **Edge check:** Are there any clipped strokes, stray ticks at tile corners, or white slivers between adjacent regions?
4. **Consistency check:** Do stroke weights, corner roundness, colour saturation, and grounding match the best icons in the repository (`apple`, `cat`, `bike`, `booking`, `house`)?
