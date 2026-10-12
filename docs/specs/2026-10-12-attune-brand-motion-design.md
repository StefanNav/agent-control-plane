# Attune brand motion: design

**Date:** 2026-10-12 · **Phase:** 11 (Brand motion) · **Branch:** `phase-11-brand-motion`
**Builds on:** [`2026-10-08-agent-control-plane-prototype-design.md`](2026-10-08-agent-control-plane-prototype-design.md) and [`2026-10-09-guided-tour-design.md`](2026-10-09-guided-tour-design.md).
**Source:** the Attune motion kit v1.0, kept as handed over in `reference/attune-motion-kit/`.

> **As built (2026-10-12).** These changes from the build differ from the text below, which is kept as written:
> - **Any landing view uses up the welcome**, including one held by the open tour or kept still by reduced motion. Otherwise a session that started mid-tour could get the dance when the tour closed on the landing page.
> - **Below 1200 px the welcome sits beside the intro.** The app shell is at least 1280 px wide, so narrower windows scroll sideways, and at the far right the mark would be cut off.
> - **The kit's 0.38 s blend-in on start isn't ported**, so the dance starts a little more briskly.
> - **Added after Stefan's preview review: a full-page welcome before a tour link's first screen.** In a fresh session the page is covered by the mark's First hello over "Attune / Agent Control Plane". After a beat at rest it fades to the tour's welcome card. It never shows under reduced motion, and a click or a key skips it.
> - **Also after the preview review, the tour's voice meter leads the caption line.** This is a tour change, outside §2's "out of scope" list, made at Stefan's request.

---

## 1. Goal

A final polish: give Attune, the company behind AIMS, a mark that appears with a short welcome when a visitor first arrives, and appears still everywhere else the Attune name shows. The product screens stay exactly as they are.

### Success criteria

- On the first landing visit in a browser session, the mark plays the kit's "First hello" (about 2.25 s), then settles into the still mark and stops.
- The landing buttons work from the first frame. Nothing waits for the motion, and the mark never shifts the layout.
- Coming back to the landing page in the same session, reloading it, or arriving with the tour open shows the still mark.
- With reduced motion turned on, the mark is still and no animation frame runs.
- The still mark sits in the prototype bar, on About, on the narrow-screen page and in the browser tab icon.
- The product's "AIMS" wordmark and every product screen are unchanged.
- Colours come only from `--cs-*` tokens. All existing tests stay green, and axe stays clean.

### What Stefan said (inputs)

- The kit's motions are samples. They can be edited, and they don't have to be kept exactly.
- This is a final polish. It is checked on a preview before anything reaches `main`.
- Placements: the landing page plus the still mark. Not the tour's voice meter, the product's work moments or the tour's welcome card.
- Colour: product indigo, so the page has one blue.
- Build: whatever is best. That is a typed port of only what we use, chosen over loading the kit's script or a CSS-only version.

## 2. What visitors see

| Where | What | Size |
|---|---|---|
| Landing hero, right of the intro, lined up with "Agent Control Plane" | First hello once per session, then the still mark | 140 px footprint (the resting mark is about 88 px wide) |
| Prototype bar, before "Attune" | Still mark in the light-on-ink pair | 14 px |
| About, before the mono "Attune · Agent Control Plane" line | Still mark | 16 px |
| Narrow-screen page (below 1024 px), above its mono line | Still mark | 32 px |
| Browser tab icon (`public/favicon.svg`) | Still mark on the ink rounded square, replacing the Countersign check | 32 px canvas |

The mark is decorative everywhere: `aria-hidden`, never focusable. It adds no new copy. The bar link's accessible name stays "Attune · Agent Control Plane · Prototype".

**Out of scope:**
- The tour, including its voice meter, welcome card and buffering.
- Waits or loaders on product screens.
- The "AIMS" wordmark.
- The social preview image `og.png`.
- Dark-theme pages: `/wall` and the gallery panels don't show the mark.

## 3. Motion

The motion is the kit's own geometry: four pebbles, each a four-curve path that blends between a soft pebble and a circle.

- **First hello:**
  - 0 to 2.25 s: the two pairs of pebbles dance (the kit's `welcome` pose).
  - 2.25 to 2.77 s: they settle into the still mark (the kit's `complete` settle: 0.42 s per pebble, staggered by 25 ms).
  - Then it stops. The kit's welcome would fall into the quiet loop while work loads. The landing page has nothing loading, so we settle instead.
- **Time** comes from `requestAnimationFrame` timestamps, with each frame's step capped at 50 ms (as in the kit).
  - A tab opened in the background doesn't run frames, so the welcome plays when the visitor actually looks.
  - This is presentation time, not the demo clock. The `src/lib/clock.ts` rule is about dates in product data.
- **Once per session:** the flag `attune-welcomed` is written to `sessionStorage` when the dance starts, so a reload mid-dance doesn't replay it. If storage throws (private mode, blocked site data), it falls back to memory, like `src/store/storage.ts`.
- **When it stays still:** the mark skips the dance and renders still if any of these hold:
  - reduced motion is on;
  - the session has already been welcomed;
  - the tour is open (the tour's "Who it's for" chapter shows the landing page, and the tour's own welcome must stay the only focal point).
- **Changes during the dance:**
  - If reduced motion turns on, or the tour opens, the mark jumps to still.
  - Leaving the page cancels the frame.
- **Tuning:** the kit is a sample. After the first preview, Stefan may ask to tune the duration or the amount of travel. The geometry module keeps those values as named constants.

## 4. Build

The mark is Attune's brand, not a Countersign primitive and not hospital domain, so it lives in the prototype layer.

```
src/prototype/AttuneMark/
  geometry.ts        HOME, RADII, Pose; restPose, pebblePath, quietPose, welcomePose, settlePose; WELCOME_S, SETTLE_S
  session.ts         hasWelcomed(), markWelcomed(): sessionStorage with a memory fallback
  AttuneMark.tsx     still mark: tight viewBox "-70 -65 140 130"; props size, tone ('surface' | 'ink')
  AttuneWelcome.tsx  the landing's First hello: 200-unit viewBox footprint; data-state="dancing" | "still"
  useWelcomeMotion.ts  the requestAnimationFrame loop; writes d/transform straight to the four path refs (no React state per frame)
  AttuneMark.module.css  fills from tokens; layout only
  index.ts
```

**Tokens** go in `src/design-system/tokens.css`, beside the other colour tokens, with a comment that they are the Attune mark's:

| Token | Light | `[data-theme="dark"]` |
|---|---|---|
| `--cs-mark-deep` | `var(--cs-acc)`, which is `oklch(0.43 0.15 268)` | `oklch(0.74 0.12 268)` |
| `--cs-mark-soft` | `oklch(0.7 0.1 268)` | `oklch(0.86 0.06 268)` |
| `--cs-mark-deep-on-ink` | `oklch(0.74 0.12 268)` | same |
| `--cs-mark-soft-on-ink` | `oklch(0.86 0.06 268)` | same |

Pebbles 1 and 4 (top left, bottom right) are deep, and 2 and 3 are soft, as in the kit. The prototype bar is ink in every theme, so it uses the on-ink pair. The favicon is a standalone file and can't read CSS variables, so it carries the on-ink pair as sRGB hex, like the current favicon does.

**Wiring:**
- `Landing.tsx`: the intro and the mark sit in a two-column hero (`minmax(0, 720px) 140px`, space between). The mark column is fixed, so the layout doesn't move. The final vertical alignment is checked against screenshots at 1440 and 1024 px.
- `PrototypeBar.tsx`: `<AttuneMark size={14} tone="ink" />` inside the brand link, 8 px before the text.
- `About.tsx` and `DesktopGate.tsx`: a still mark beside or above their mono line.
- `public/favicon.svg`: redrawn.
- Nothing in `src/design-system/primitives`, `src/components` or `src/features` changes.

## 5. Testing

Logic is written test-first.

- **Unit tests (Vitest):**
  - `geometry`:
    - `restPose` is the home position;
    - `welcomePose(0)` is the rest pose;
    - `welcomePose(2.25)` equals `quietPose(0)`;
    - `settlePose` reaches rest by 0.52 s;
    - `pebblePath(i, 0, 1)` matches the kit's static `assets/attune-symbol.svg` paths.
  - `session`: the flag round-trips, and the memory fallback holds when storage throws.
- **Component tests (Testing Library, with fake `requestAnimationFrame` and `matchMedia`):**
  - `AttuneMark`:
    - renders four `aria-hidden` paths;
    - each tone uses its token pair.
  - `AttuneWelcome`:
    - a first mount dances, then reaches `data-state="still"` and requests no more frames;
    - a second mount in the same session is still at once;
    - with reduced motion it is still and requests no frame;
    - with the tour open it is still;
    - unmounting cancels the pending frame.
- **End-to-end tests (Playwright):**
  - In `landing.spec`:
    - the hero mark is present and decorative, and it ends still within 4 s;
    - after a reload it is still at once;
    - under `emulateMedia({ reducedMotion: 'reduce' })` it is still at once;
    - the 1024 px gate shows its mark.
  - In `routes`: the prototype bar shows its mark.
  - `a11y.spec` (axe) keeps covering the landing page.
  - The whole suite, including the tour specs, stays green.
- **Visual check:** side-by-side screenshots at 1440 and 1024 px of:
  - the landing page mid-dance and settled;
  - the prototype bar, About and the gate;
  - the tab icon.
- **Before committing and pushing:** `pnpm check` before every code commit, and the forbidden-terms check before every push.

## 6. Shipping

- **Branch:** `phase-11-brand-motion` from `main` at `c788292`. The kit is committed under `reference/attune-motion-kit/`, which ESLint already ignores, so the port can be checked against its source.
- **Tracking:** Phase 11 gets the following, as earlier phases did:
  - a row in `docs/BUILD_PLAN.md`;
  - a plan file `docs/plans/phase-11-brand-motion.md`;
  - a GitHub milestone and issue;
  - one PR, with a Vercel preview.
- **Checkpoint:** Stefan reviews the preview, including the landing in Safari and a reduced-motion pass. Nothing merges to `main` without his approval.
- **Decision log rows:**
  - Attune brand motion is limited to the landing page plus the still mark, and product screens are untouched.
  - The mark is product indigo, using four new `--cs-mark-*` tokens.
  - The kit is ported, not loaded: only welcome, quiet and settle are ported to TypeScript.
  - The favicon becomes the Attune mark.
