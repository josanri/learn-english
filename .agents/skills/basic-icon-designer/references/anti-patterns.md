# Visual Anti-Patterns (Never Repeat)

Every item below was a real failure rejected during visual review at 56 px:

1. **Muddy micro-faces on small figures** (`tall`, `short`, `slim`, `thin`, `skinny`, `arm`, `back`):
   - Drawing eyes, hair spikes, and mouths inside `6–9` unit heads creates illegible black smudges at 56 px.
   - **Fix:** Heads `< 12` units in diameter MUST be clean faceless silhouettes.
2. **Heavy internal outline cage on busts** (old `angry`, `blonde`, `british`):
   - Thick dark outlines around sticking-out ears, neck tubes, collar scoops, hook noses, and sawtooth bangs made people look awkward and childish.
   - **Fix:** Use Clean Minimal Flat busts (`r=9.5` circle, smooth shoulders, sleek hair, minimal face) and Classic Emoji for feelings.
3. **Pasted geometric shapes for body builds** (old `fat`, `overweight`, `well-built`, `medium-height`):
   - Sharp `<rect>` torsos or giant ovals pasted in front of thin stick arms look like people holding pillows or boxes.
   - **Fix:** Draw continuous, smooth, proportional silhouette paths.
4. **Hair drawn over the shirt** (old `black-hair`, `blonde`, `straight-hair`, 86 icons):
   - Back hair rendered after the torso creates a solid hair bib over the chest.
   - **Fix:** Always place back-hair paths BEFORE the torso/shirt path.
5. **Inner fills bleeding over dark outlines** (old `adventurous`, `mountain`, `difficult`, `funny`, `excited`):
   - White snowcaps or pink tongue shapes drawn after a container's outline stroke clip/bleed over the dark `#2b3445` border or leave gaps underneath.
   - **Fix:** Clip inner fills (teeth, tongue, shading, snowcaps) inside a `<clipPath>` of the container shape (`stroke="none"`), then draw the container's outline stroke LAST (`fill="none"`).
6. **Horizon & waterline white gaps** (old `beach`, `boat`, `turtle`):
   - Sky rects stopping above a wavy sea line, or boats/animals hovering above wave troughs, leave ugly white slivers.
   - **Fix:** Extend sky fills below the wave crest; draw front water waves AFTER hulls/limbs.
7. **Floating objects** (old `bar`, `grilled`, `sausage`):
   - Drinks floating above the bar counter, steak hovering above grill bars, or sausage hovering above a line.
   - **Fix:** Anchor bases flush on the supporting line/surface.
8. **Double-line roof gaps** (old `accommodation`, `garage`, `homework`):
   - Drawing an offset roof stroke 1.5 units above a house triangle creates a floating double-edge gap.
   - **Fix:** Build the roof as a clean filled chevron flush with the gable peak and walls.
9. **Invisible foreground on dark paint** (old `black`, `dark-blue`, `spicy`, `raw`):
   - Dark bristles on black paint or black flames on dark outlines vanish at 56 px.
   - **Fix:** Add a light contrast rim (`#ffffff` / `#c3cad4`) on dark-on-dark overlaps; colour flames orange/yellow (`#f08a24` / `#f6c431`).
10. **Gendered faded relatives & confusing trees** (old `boyfriend`, `aunt`, `brother-in-law`, `father-in-law`, `nephew`):
    - Gendered faded partners imply a specific couple gender; placing a brother-in-law above the couple looks like a parent-in-law; drawing 4 nodes for `nephew` duplicates `cousin`.
    - **Fix:** Use gender-neutral faded silhouettes and the exact tree geometries in `category-playbooks.md`.
11. **Duplicate concepts across sibling words** (old `fried` duplicating `chips`; old `lamb` looking like a fried egg):
    - Always check sibling icons in the same group before choosing a metaphor.
12. **Cluttered micro-details** (old `arrival`, `departure`):
    - Tiny 0.85-unit airplane windows and landing gear blur into noise at 56 px.
    - **Fix:** Use bold, clean, uncluttered flat silhouettes.
13. **"Cutre" half-bordered landscape boxes** (old `field`, `lake`, `river`, `island`, `sea`, `countryside`):
    - Drawing an unstroked pale-blue square sky on top of a thick black rectangular ground box, with flat MS-Paint horizontal strips and thick black outlines on background furrows/mountains, looks cheap and unfinished.
    - **Fix:** Clip all scene layers inside one `42×42` `rx="7"` rounded badge, layer unstroked atmospheric sky + tonal midground + crisp foreground, and finish with ONE clean outer `#2b3445` border.
14. **Tiny-doll + tiny-prop scenes for abstract traits** (old `talkative`, `selfish`, `rude`, `lazy`, `polite`, `honest`, `patient`, `hard-working`):
    - Squeezing a 16-unit person into one corner next to a tiny prop wastes space and makes expressions and props unreadable at 56 px.
    - **Fix:** Use a bold `r=16..18` Classic Emoji for expressive traits (`serious`, `shy`, `quiet`, `nervous`, `impatient`, `rude`, `funny`, `sensitive`, `friendly`) and ONE bold, full-canvas visual metaphor for behavioural traits (`talkative`, `lazy`, `selfish`, `polite`, `honest`, `patient`, `hard-working`).
