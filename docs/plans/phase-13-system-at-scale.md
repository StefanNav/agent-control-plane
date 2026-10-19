# Phase 13: Countersign at scale

> **For agentic workers:** steps use checkbox (`- [ ]`) syntax for tracking. Conventions are in `CLAUDE.md`; the design system's own rules are in `docs/design-system/contributing.md`.

**Goal:** make the design system hold up as more people, and more AI, build on it. The audit found that what was enforced (colour, status) held and what was left to convention (spacing, type, layout patterns) drifted. This phase turns conventions into tokens and checks, promotes one copied pattern end to end, and writes down how to add to the system.

**Constraint (Stefan, 2026-10-19):** the live prototype must keep working exactly as it does. Everything merged in this phase is pixel-identical on every product screen, proven by the screenshot gate. The only intended visual change is a new section in the component gallery.

**Issue:** #29 · milestone 14 · branch `phase-13-system-at-scale`

## Tasks

- [x] **13.1 Screenshot gate.** `tests/visual/screens.spec.ts` and `playwright.visual.config.ts`: every frame in `tests/capture/frames.ts` in its state, every route's sample path, and five variants (100 screens). `pnpm visual:baseline` writes the baseline to `.visual/` (ignored); `pnpm visual` compares with `maxDiffPixels: 0`. Measure the page only after fonts load (the first version was unstable on `/operations/reviewers`). Proven stable: two runs on unchanged code, 100 of 100.
- [x] **13.2 Debt audit and ratchet.** `scripts/ds-audit.mjs` counts, in product code: typed colours, spacing, font sizes, line heights and radii; copies of the label role; styled blocks repeated across stylesheets outside the design system; raw form and table elements in screens; imports across features; scoped tokens out of scope. `scripts/ds-audit.baseline.json` is the ratchet; `scripts/ds-audit.test.mjs` fails if a count rises, and asks for `--write` when one falls.
- [x] **13.3 Tokens.** `--cs-space-*` (the handoff's 15 steps), `--cs-type-<role>-size` and `-line` (7 roles), `--cs-radius-*`, `--cs-motion-row`, `--cs-layer-*`. The Epic stand-in's tokens move to `tokens-ehr.css` and the Attune mark's to `src/prototype/brand-tokens.css`. Token tests pin every value.
- [x] **13.4 Migration.** `scripts/ds-migrate-tokens.mjs` moves exact on-scale values to tokens (1,990 values, 65 stylesheets). Coverage: spacing 0% → 97%, font sizes 0% → 96%, line heights 0% → 89%, radii 0% → 100%. `pnpm visual`: 100 of 100 identical.
- [x] **13.5 Layers in ESLint.** The design system may not import product code; components may not import the store, features or the prototype; screens import the system only through `src/design-system/index.ts` (the prototype may also use `type.module.css`).
- [x] **13.6 SidePanel.** Built to the design source (`side`, `sideHead`, `sBlock`) in `src/design-system/primitives/SidePanel`, test first. It replaces onboarding's local `SideCard` (also imported by review) and `StepSide`'s head. `pnpm visual`: 100 of 100 identical. The gallery shows it light and dark (the one intended change). The other 19 copies in 7 features differ from the spec by 1 to 12 px and are listed in `docs/design-system/audit.md` for a decision.
- [x] **13.7 Docs.** `docs/design-system/README.md` (overview and foundations), `components.md` (reference), `contributing.md` (how to add, definition of done, the checks), `audit.md` (findings, before and after, backlog). Rules for AI sessions in `CLAUDE.md`.
- [x] **13.8 Whole-branch review, PR, checkpoint.** Review: 0 Critical; 3 Important and the minors fixed. PR #30. `pnpm check`, `pnpm e2e`, `pnpm visual` green; forbidden-terms check; PR closes #29; Stefan reviews the preview before merge.

## After merge

- Sync the Countersign design-system project in Claude Design from `docs/design-system/` and the tokens (Stefan starts `/design-sync`).
- Work the backlog in `docs/design-system/audit.md`, one ratchet at a time.
