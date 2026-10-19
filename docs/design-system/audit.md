# Countersign audit, 19 Oct 2026

Agent Control Plane was built quickly: about 50 screens across seven roles in under two weeks, by one designer working with AI, on a design system set up first. That's the situation a lean product team is in every week. This audit looks at what the system held and what it didn't, and why.

## The short version

**What was enforced held. What was left to convention drifted.**

Colour was enforced from day one: every colour was a token, and every status went through one component (`StatusChip`) that pairs colour, shape and word. Across 8,300 lines of CSS, two colour values sat outside the tokens.

Spacing, type and corner radii were rules in a document. The values were mostly right: 96% of spacing values were on the scale. But they were right because someone copied them, not because anything pointed at a source. Patterns that never became components were rebuilt screen by screen, and the copies began to drift.

The fix wasn't to review harder. It was to make the system the easy path, and then make the debt visible and impossible to grow.

## Before and after

`pnpm ds:audit`, product code only (the design system, product components, layout and screens; not the prototype's landing page and tour):

| | `main` before | After this pass |
|---|---:|---:|
| Colour values typed outside the tokens | 2 | 2 |
| Spacing typed in px | 1,029 | **37** |
| Font sizes typed in px | 506 | **19** |
| Corner radii typed in px | 118 | **0** |
| Copies of the label type role outside the system | 31 | 31 |
| Styled blocks repeated across stylesheets | 184 | 183 |
| Raw `<button>`, `<table>` and so on, where a primitive exists | 17 | 17 |
| Imports from one feature's folder into another's | 55 | 54 |
| Scoped tokens used out of scope | 0 | 0 |
| **Token coverage:** spacing · font sizes · radii | 0% · 0% · 0% | **97% · 96% · 100%** |

Every number in the right-hand column is now a ratchet: the unit tests fail if one rises. The numbers that didn't move are the backlog below. They're visible now, and they can only go down.

`pnpm visual` compared 100 screens (every designed frame in its state, every route, and five variants) before and after: **all 100 are pixel-identical.** The one intended change is a new side-panel section in the component gallery.

## What held, and why

- **Colour.** 29 product colour tokens in OKLCH, light and dark, pinned to the handoff's values by tests. Two stray values in 8,300 lines of CSS: a translucent white on the division board and a chart tooltip's shadow.
- **Status meaning.** `StatusChip` owns the mapping from status to colour, shape and weight, through a typed list of statuses. Screens almost never colour a status themselves.
- **The layers.** The design system has no hospital knowledge, and product components never touch the store. That held by habit; ESLint now enforces it.
- **Adoption.** Screens really do use the primitives: `Button` in 52 files, `StatusChip` in 33, `Notice` in 35, `Table` in 25.

## What drifted, and why

**1. Only colour had tokens.** Spacing, type, radius, motion and layering were values in the handoff, so 1,029 spacing values, 506 font sizes and 118 radii were typed by hand. About 30 spacing values were off the scale (3, 5, 7, 9, 13, 15, 18 px), along with font sizes of 11, 15, 22 and 26 px.

**2. The type roles existed, but in the wrong shape.** `type.module.css` defined each role as a class, which a screen can only use by changing its markup. No product file imported it. Instead, the roles were retyped in stylesheets: the meta role (12/16) 19 times, the UI role in meta colour 12 times, the card title 9 times, and the mono label role 31 times. That's the biggest source of copied blocks.

**3. A pattern that never became a component got copied.** The design source names the side panel (`side`, `sideHead`, `sBlock`), but the code never had it. Onboarding built it as a local component, `SideCard`. The review screens imported it from onboarding's folder, and six other features, which couldn't see it there, copied its CSS. Those copies now differ from the spec:

| Feature | Panels | Difference from the spec |
|---|---|---|
| promotion | Ladder legend, Who decides | Head ends at 15 px instead of 16 |
| evidence | Open gaps | Head ends at 15 px, with the rule under the head instead of over the first block |
| activity | The current level (its title changes with the level), Level changes | Head ends at 0; the rows below carry the spacing |
| golive | What changes when you sign, Conditions, Go-live decision, Why lines differ | Head ends at 8 px |
| changes | Re-validate, Effect on activities, Release, Timeline | 4 px between title and meta (not 2); head ends at 12 px; blocks padded 12 20 16 (not 16 20 20) |
| reviewers, stepdown | How to read it, Independent check, Respond, Autonomy level, Timeline, triggers | A different shape: one padded card with no ruled head |

The card surface itself (white, line border, 6 px radius) is rebuilt by hand about 19 times, often where `Card` would do.

**4. Features lean on each other.** 55 imports reach from one feature's folder into another's (review → onboarding 10, board → controls 5, audit → board 5). Each one is a way a change in one feature breaks another.

**5. Sizes have no shared vocabulary.**
- Button uses `size: 'md' | 'sm'`.
- StatusChip uses `size: 'compact' | 'header' | 'comfortable'`.
- AutonomyLadder uses `variant` plus `size: 'row' | 'panel' | 'wide'`.
- Table uses `density`.
- Avatar takes a number.

Density (13, 14 or 16 px) is a core idea of the system, with no shared name.

**6. The system and the screens grew apart in places.** `ExceptionList`, `ResumeDialog`, `InstructionCard` and `Paper` appear only in the component gallery. The inbox draws its own `InboxItem`, and resume is an inline `ResumePanel`. Either those components should be adopted, or they should be retired.

**7. Rules broken inside the system itself.** `AutonomyLadder` draws a held level with a dashed outline, but dashed means "no data" and nothing else.

**8. Accessibility gaps in primitives.** Each of these reaches every screen that uses the primitive:
- `Menu` doesn't mark selected items with `aria-checked`.
- `Field` doesn't link its help and hint text to the control with `aria-describedby`.
- `Notice` isn't announced when it appears.
- `ExceptionList`'s "new" dot has no text alternative.

**9. Nothing checked any of it.** There was no lint rule for layers, no count of debt, and no screenshot comparison. The capture suite was for checking by eye.

## What changed in this pass

- **Tokens for every foundation.**
  - Space: the handoff's 15-step scale.
  - Type: 7 roles, each a size and a line height.
  - Radius: 6 steps plus round.
  - Motion and layers.
  - The Epic stand-in's and the Attune mark's tokens moved into scoped files.
- **A scripted migration** (`scripts/ds-migrate-tokens.mjs`) moved every exact on-scale value to its token: 1,990 values in 65 stylesheets. It only moves exact matches, so nothing can render differently. `pnpm visual` proved it.
- **`SidePanel` joined the system,** built to the design source's spec. Onboarding's local copy is gone, and onboarding and review use the system's. The other copies are in the table above, for a decision.
- **`pnpm ds:audit` and its ratchet,** in the unit tests, so `pnpm check` fails if debt rises.
- **ESLint enforces the layers,** and screens import the system only through its front door.
- **`pnpm visual`,** a screenshot gate over 100 screens.
- **These docs:** [README.md](README.md), [components.md](components.md), [contributing.md](contributing.md), and the rules in `CLAUDE.md`.

## Backlog

In rough order of value. Each item is one pull request that lowers a ratchet.

1. **Decide the side-panel differences** in the table above: adopt the spec (screens move by 1 to 12 px), or name a second variant for the padded shape. Then migrate 19 panels in 7 features.
2. **Make the type roles reachable from stylesheets.** Add a composable class per role (label, meta, card title), so a screen writes one line instead of five. Migrate the 31 label copies and the most-copied blocks.
3. **Use `Card` for the 19 hand-built card surfaces.**
4. **Move shared UI out of features:** onboarding's `StepCard` (used by review) and board's helpers (used by audit, inbox, evidence and reviewers). 54 imports across features to remove.
5. **Fix the accessibility gaps** in Menu, Field, Notice and ExceptionList. Each fix reaches every screen that uses the primitive.
6. **Fix the held state in AutonomyLadder** so dashed keeps one meaning.
7. **Adopt or retire** ExceptionList, ResumeDialog, InstructionCard and Paper.
8. **Rename size props to `density`** through alias, migrate, remove.
9. **Decide the off-scale values:** 37 spacing values (negative offsets and border compensation among them) and 19 font sizes, mostly the wall display's large type.
10. **Run `pnpm visual` in CI** with baselines taken on the CI machine, so every pull request shows its screens.
