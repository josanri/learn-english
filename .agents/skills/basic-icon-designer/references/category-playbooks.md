# Category Playbooks

Follow the exact blueprint for each vocabulary category so the entire 915-icon set feels drawn by one hand.

## 1. Feelings & Expressive Personality Traits → Classic Round Emoji

Applies to all 18 words in `feelings / Feelings` (`happy`, `sad`, `angry`, `sleepy`, `tired`, `hungry`, `thirsty`, `bored`, `excited`, `worried`, `scared`, `surprised`, `embarrassed`, `proud`, `jealous`, `lonely`, `busy`, `calm`) AND expressive personality traits (`serious`, `shy`, `quiet`, `nervous`, `impatient`, `rude`, `funny`, `sensitive`, `friendly`).

- **Why:** A `r=18` emoji face is **twice as large** as a bust's `r=9.5` head. At 56 px, subtle expressions (`shy`, `serious`, `nervous`, `impatient`, `quiet`, `rude`) are instantly legible on a `36`-unit emoji and muddy on a `19`-unit bust.
- **Base circle:** `<circle cx="24" cy="24" r="18" fill="#f6c431"/>` (shift slightly to `cx="21..22" cy="25..27" r="16..17"` when pairing with a top-right badge like `Z z`, clock, `!`, battery, heart, or waving hand).
- **Colour cues (only where universally iconic):**
  - Default / positive / neutral: `#f6c431`
  - `angry` / `rude`: `#f06c5b`
  - `scared` / `lonely`: `#a8d4f5`
  - `jealous`: `#a8d45c`
- **Feature boldness:** Eyes `r="1.9..2.2"` (solid `#2b3445`, no white highlight dots); brows and mouths `stroke-width="2.0..2.4"`.
- **Single clear cue:** At most one secondary badge (e.g. teardrop, sweat drop, clock, `...`, `!`, `Z z`, heart, shushing finger, censor bar). Never stack multiple competing badges.

## 1b. Abstract & Behavioural Personality Traits → Bold Single-Concept Metaphors

Applies to behavioural traits that are NOT pure facial expressions (`talkative`, `lazy`, `selfish`, `polite`, `honest`, `patient`, `sociable`, `outgoing`, `hard-working`, `independent`, `kind`, `generous`, `clever`, `creative`, `confident`, `reliable`, `responsible`, `helpful`, `optimistic`, `pessimistic`, `romantic`).

- **Hard rule:** NEVER draw a tiny 16-unit person squeezed into one corner next to a tiny prop (like a tiny hourglass, tiny speech bubble, tiny jar of dots, or tiny bed). That wastes half the 56 px tile and makes both person and prop illegible.
- **Instead, enlarge the core metaphor to fill 75–85% of the `48×48` canvas:**
  - `talkative`: 3 bold overlapping colourful speech bubbles with chatter lines.
  - `polite`: 1 bold speech bubble containing a warm pink heart & sparkle.
  - `honest`: 1 bold speech bubble containing a crisp green checkmark badge.
  - `patient`: 1 bold golden-sand hourglass.
  - `lazy`: 1 bold colourful hammock slung between posts with a pillow & floating `Z z`.
  - `selfish`: 2 curved hands clutching a gift & gold coins tightly inward (direct visual opposite of `generous`).
  - `hard-working`: 1 bold open laptop with progress check + gear + coffee cup.
  - `sociable`: 3 clean faceless silhouettes linked under a shared chat bubble.
  - `outgoing`: bold joyful faceless silhouette jumping with stars.
  - `independent`: framed layered summit vignette with lone faceless hiker & flag.

## 2. People Busts (Appearance, Hair, Jobs, Health, Actions) → Clean Minimal Flat

Applies to single-person close-up busts where the head fills ~40% of the canvas (`r=9.2..9.5`).

- **Shoulders:** `<path d="M9 44V41Q9 31 24 31Q39 31 39 41V44Z" fill="{shirt}"/>`
- **Head:** `<circle cx="24" cy="19" r="9.5" fill="{skin}"/>` (no ears, no outlined neck tube, no scoop collar line; exception: `neck.svg` shows a clean highlighted neck).
- **Hair:**
  - Back hair (`long`, `straight`, `bob`, `wavy`, `curly`, `ponytail`, `bun`) is ALWAYS drawn **before** the shoulders.
  - Front hair sits smoothly along the upper arc of the `r=9.5` circle — no jagged sawtooth bangs and no extra hair-shine stroke.
- **Face:**
  - Eyes: `<circle cx="20.3" cy="19.8" r="1.25" fill="#2b3445" stroke="none"/>` and `cx="27.7"`.
  - Smile: `<path d="M21 24Q24 26.2 27 24" fill="none" stroke-width="1.7"/>`.
  - **No eyebrows** on neutral smiling faces. Add expressive brows ONLY when the word requires an expression (`impatient`, `headache`, `serious`, `rude`, `nervous`).
  - **No nose** except on `nose.svg`. **No pink cheek ovals** except subtle blush on `shy.svg` and `embarrassed.svg`.

## 3. Height & Build / Full-Body Figures → Clean Faceless Silhouettes

Applies to `tall`, `short`, `medium-height`, `slim`, `thin`, `skinny`, `overweight`, `fat`, `well-built`, `muscular`, `fit`, `athletic`, and any small full-body action figure whose head diameter is `< 12` units.

- **Hard rule:** NEVER draw eyes, mouth, nose, or detailed hair inside a `< 12`-unit head. Use a smooth solid/flat silhouette head (`<circle>` in a rich cohesive colour or natural flat skin + simple cap, zero face dots).
- **Body shape:** Draw the torso, waist, hips, and legs as **smooth, continuous, proportional human silhouettes** — NEVER rigid sharp-cornered rectangles (`<rect>`) and NEVER pasted ovals/circles in front of arms.
- **Height comparisons (`tall`, `short`, `medium-height`):**
  - Pair the highlighted target silhouette (saturated palette colour) against 1 or 2 faded neutral grey reference silhouettes (`fill="#d3dae4" stroke="#8590a2"`).
  - Keep clear horizontal spacing (`>= 2` units gap between figures — zero overlap!).
  - Add one crisp measurement cue (vertical height ticks or a single clean up/down arrow or horizontal level bar).
- **Build comparisons (`slim`, `thin`, `skinny`, `overweight`, `fat`, `well-built`, `muscular`, `fit`, `athletic`):**
  - Each word must have a **distinct, unmistakable silhouette** at 56 px:
    - `slim`: graceful gently tapered waist silhouette (green), balanced & healthy.
    - `thin`: visibly narrow straight silhouette (sky-blue) with a clean subtle vertical tape/measure accent.
    - `skinny`: extra-narrow long-limbed silhouette (amber) with crisp inward arrows (`→  ←`).
    - `overweight`: smooth, naturally fuller rounded silhouette (blue) — continuous waist/hip curve, respectful, no caricature.
    - `fat`: smooth, visibly broader rounded silhouette (coral/pink) — continuous natural curve, respectful, no pasted shapes.
    - `well-built`: broad-shouldered strong V-taper silhouette (red), confident hands-on-hips stance.
    - `muscular`: bold upper-body close-up flexing both arms with clear curved bicep silhouettes (green).
    - `fit`: energetic figure in joyful V-stretch pose + crisp green heart/vitality badge.
    - `athletic`: dynamic forward-leaning runner mid-stride with crisp speed lines.

## 4. Body Parts → Bold Close-up Anatomy

Applies to `arm`, `back`, `hand`, `finger`, `leg`, `knee`, `foot`, `eye`, `ear`, `mouth`, `tooth` (and close-up bust highlights for `head`, `face`, `neck`, `shoulder`, `nose`, `stomach`).

- Never shrink a whole human body to highlight a limb. Draw the body part itself large and bold (`65–80%` of the canvas).
- When highlighting a zone (`back`, `stomach`, `knee`, `neck`, `shoulder`, `head`, `face`, `nose`), use one neat dashed `#3f6fd8` loop with soft `#fff3b0` (`fill-opacity=".35"`) fill.

## 5. Family Relations → Inclusive Trees & Pairs

- Highlight ONLY the target relative in full colour (Clean Minimal Flat bust).
- Draw ALL context relatives (partner, parent, spouse, child) as **gender-neutral faded silhouettes**:
  - `fill="#d3dae4" stroke="#8590a2" stroke-width="2.2"` (smooth circle head + rounded arch shoulders, NO hair or gendered clothing).
- **Clear relationship geometry:**
  - Romantic pair (`boyfriend`, `girlfriend`): 2 busts side-by-side + pink heart above.
  - Married pair (`husband`, `wife`): 2 busts side-by-side + gold interlocking rings above.
  - Parent's sibling (`aunt`, `uncle`): top horizontal sibling bracket linking faded parent (left) and highlighted aunt/uncle (right), vertical drop line strictly under the left parent to faded child.
  - Sibling's child (`nephew`, `niece`): top horizontal sibling bracket linking faded you (left) and faded sibling (right), vertical drop line strictly under the right sibling to highlighted nephew/niece (3 nodes total — distinct from 4-node `cousin`).
  - Spouse's sibling (`brother-in-law`, `sister-in-law`): horizontal 3-node row (`[faded you] —rings— [faded spouse] —top sibling bracket— [highlighted in-law]`).
  - Spouse's parent (`mother-in-law`, `father-in-law`): faded couple with rings on bottom row + vertical line straight up from spouse to highlighted parent-in-law.
  - Step-parent (`stepfather`, `stepmother`): faded parent + `=` + highlighted step-parent on top row, vertical line down from faded parent to faded child.

## 6. Nationalities & Flags

- Country icons (`spain`, `united-kingdom`, etc.): crisp official-ratio flag alone, centered with `stroke-width="1.8"` border.
- Nationality icons (`spanish`, `british`, etc.):
  - Flagpole at `x=22.5` (`y=4.2..44`), gold finial at `(22.5, 3.5)`.
  - Official-ratio flag fitted cleanly inside `x=23.5`, `maxW=22.5`, `maxH=15.6` with unique `clipPath id="f-<name>"`.
  - Neutral Style 1 minimal flat bust at `translate(-3.4 11.8) scale(0.73)` (`#9aa3b2` shirt, `#d9a173` skin, `#4a3122` short hair) — zero overlap with pole or flag.

## 7. Landscapes, Nature & Sky Scenes → Framed Layered Vignettes

Applies to full-bleed environmental scenes (`field`, `island`, `countryside`, `river`, `lake`, `sea`, `sky`, `moon`, `star`, `mountain`, `hill`, `forest`, `grass`, `beach`, `dawn`, `dusk`, and city landmarks).

- **Standard container template:**
  ```xml
  <defs><clipPath id="scene-<name>"><rect x="3" y="3" width="42" height="42" rx="7"/></clipPath></defs>
  <g clip-path="url(#scene-<name>)">
    <!-- 1. Two-tone sky / horizon glow (stroke="none") -->
    <!-- 2. Unstroked midground hills / peaks / far water / clouds -->
    <!-- 3. Crisp foreground subject + water/ground shading -->
  </g>
  <rect x="3" y="3" width="42" height="42" rx="7" fill="none" stroke="#2b3445" stroke-width="2"/>
  ```
- **Clear differentiation across nature words:**
  - `field`: Warm sunlit golden-wheat rolling terrain with curved tonal furrow stripes + distant green ridge + warm sun halo.
  - `island`: Layered tropical turquoise ocean + curved sandy mound + graceful bending palm tree with lush layered fronds.
  - `countryside`: Layered rolling green hills + red-roofed cottage + round lush tree + winding cream dirt lane.
  - `river`: Distant green hills + sweeping S-curve blue river widening toward the bottom edge with white shimmer + layered pines.
  - `lake`: Layered blue-grey alpine mountains with snow peaks + lush green valley surrounding a calm oval lake with water reflections.
  - `sea`: Sunlit sky + layered deep/bright ocean swells with white foam crests + bold crisp red-and-white sailboat.
  - `sky`: Two-tone azure-to-pale sky + glowing golden sun behind layered puffy white clouds with soft sky-blue undersides.
  - `moon`: Two-tone midnight sky + soft moon glow halo + bold golden crescent moon + crisp 4-point twinkling stars.
  - `star`: Two-tone midnight sky + soft radial glow halo + bold faceted golden 5-point star + delicate starlight dots.
  - `mountain` vs `hill`: `mountain` uses towering angular snow-capped peaks in cool slate-blue; `hill` uses soft sweeping layered green domes with warm sunshine.
  - `forest` vs `tree`: `forest` uses a framed layered woodland vignette (distant pale pines behind bold emerald foreground trees); `tree` is a standalone bold tree on white.

## 8. Daily Actions & Routines → Bold Action-Objects or Faceless Silhouettes

Applies to verb/action words (`wake-up`, `get-up`, `have-a-shower`, `get-dressed`, `brush-your-teeth`, `go-to-work`, `go-to-bed`, `sleep`, `eat`, `drink`, `tidy-up`, `make-the-bed`, `do-the-washing-up`, `do-the-shopping`, `take-out-the-rubbish`).

- **Prefer bold action-objects + motion/direction cues** over tiny full-body dolls in miniature bedrooms/offices.
- When an action needs a human figure (e.g. `get-up`, `go-to-work`, `have-a-shower`), use a **clean faceless silhouette** or a **tight close-up crop** (`r >= 8` head) — never a `5–6`-unit micro-head.
- **Differentiate bed/sleep verbs cleanly:**
  - `wake-up`: Bold golden rising sun + ringing red alarm clock over pillow/horizon.
  - `get-up`: Crisp bed + clean faceless silhouette rising/stepping out with an upward arrow (`↑`).
  - `go-to-bed`: Framed midnight vignette with crescent moon, stars, and cozy turned-down bed with downward arrow (`↓`).
  - `sleep`: Close-up plump pillow + peaceful closed-eyes sleeping head (`r=9.5`) tucked under a soft blanket with bold `Z z`.

## 9. Standalone Objects, Food & Buildings

- Ground every standing object, drink, food item, and building solidly on its surface or ground line.
- Roofs sit flush on walls (one clean filled roof chevron, no offset stroke gaps).
- Sky fills extend behind sea/hill curves; water waves draw in front of submerged hulls/animals.
- For complex silhouettes (`arrival`, `departure`, `barcelona`, `athens`), prioritize **bold iconic geometry** over tiny dots or windows that blur at 56 px.
