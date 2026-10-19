# Adding to Countersign

How to add to the system or change it, so that what you build for one screen works on every screen and breaks none. It's written for designers, engineers and the AI assistants that write much of the code. The short version of these rules is in the repo's `CLAUDE.md`.

## 1. Start from the need, not the component

Before you write any CSS in a feature, open [components.md](components.md) → "Pick the right piece" and find the row for what you need. Most of the time something already does it.

## 2. Use, extend, compose, or build

| If… | Then | Where it lives |
|---|---|---|
| Something already does it | **Use it** as it is. Don't restyle it from outside with a `className`. | The feature |
| Something almost does it | **Extend it.** Add a prop or variant to that component, in the system, with a design review. Never fork a copy into your feature. | The system |
| It's a layout of existing pieces, for this screen only | **Compose it** in the feature, with tokens only. That isn't debt. | The feature |
| It's new, and it carries meaning: status, permission, autonomy, a signature, anything a clinician must read the same way on every screen | **Build it in the system**, on first use | The system |
| It's new, and it's only layout or presentation | **Build it in the feature** first. Promote it the moment a second feature wants it. | The feature, then the system |

Two rules make this hold:

- **A feature never imports from another feature's folder.** If a second feature wants it, that's the signal to move it into the system. The side panel shows why. Onboarding made it a component, the review screens imported it from onboarding's folder, and six other features couldn't see it there, so they copied its CSS and drifted from the spec by 1 to 12 px ([audit.md](audit.md)). `pnpm ds:audit` counts these imports, and the count can only go down.
- **Meaning goes into the system on day one.** A status, a lock or an autonomy level that looks slightly different on two screens is a safety problem, not a style problem.

## 3. Definition of done for a system component

A component is in the system when all of these are true:

- [ ] **Tokens only.** No typed colours, sizes, spacing or radii. `pnpm ds:audit` doesn't rise.
- [ ] **Meaning is explicit.** Status is colour + shape + word. Dashed means no data and nothing else. Colour follows the semantics in [README.md](README.md).
- [ ] **States are built, not implied:** default, hover, keyboard focus, selected or current, locked (with the reason) and disabled. Add empty, loading and stale where they can happen.
- [ ] **Density is named.** It works at the densities it will meet (13 px boards, 14 px UI, 16 px forms), and it uses the size names in section 4.
- [ ] **Accessible:** a role and an accessible name, keyboard use that matches the pattern, and axe clean on every screen that uses it.
- [ ] **Light and dark.**
- [ ] **Tested.** Unit tests for behaviour (Testing Library, test first), and the screens that use it still pass `pnpm e2e`.
- [ ] **Documented** in [components.md](components.md): what it's for, use when, don't use when, props that matter, states, accessibility.
- [ ] **In the gallery** at `/about/components`, in its states, light and dark.
- [ ] **Copies migrated, or listed.** Existing copies move to the new component when the screenshots stay identical. If they don't, they go on the backlog in [audit.md](audit.md) with their difference, for a design decision.
- [ ] **`pnpm visual` shows only the changes you meant.**
- [ ] **Claude Design synced** after merge, so new designs start from the current component.

## 4. Naming

- **Variants say what something means, not how it looks:** `variant="primary"`, `status="warn"`, not `blue` or `bold`.
- **Size and density:** new components use `density?: 'compact' | 'default' | 'comfortable'`, for 13, 14 and 16 px work. Existing components use other names (`size`, `variant`, `layout`); see [components.md](components.md) → "Size and density names". Don't rename them in place.
- **Shared prop names:**
  - `label` is the accessible name.
  - `sub` holds meta lines under a title.
  - `foot` is a ruled block at the end.
  - `locked` holds the reason a person can't act.
  - `stale` means no fresh data.
- **Renaming is a migration, not an edit.** Add the new name as an alias, move every caller (`pnpm visual` proves nothing moved), then remove the old name. Use one pull request per step.

## 5. Changing a component that's already in use

1. Find who uses it: "Used in" in [components.md](components.md), or search for `<Name`.
2. Take the baseline on `main` before you change anything: `pnpm visual:baseline`.
3. Make the change.
4. Run `pnpm visual`. Every screen that moved is listed, with before, after and diff images in `.visual/report`.
5. Every listed screen must be one you meant to change. A screen you didn't expect means the change reached further than you thought: fix it, or make it a decision.
6. Put the list of intended changes in the pull request.

## 6. When a check fails

| Check | What it caught | What to do |
|---|---|---|
| `scripts/ds-audit.test.mjs › … has not risen` (in `pnpm check`) | New debt: a typed value, a copied block, a raw `<button>`, an import from another feature | Run `pnpm ds:audit --list <metric>` to see where. Use the token or component. If the value is truly off the scale, that's a design decision: raise it in review. |
| `… every gain is locked in` | You reduced debt | Run `pnpm ds:audit --write` and commit the baseline. The ratchet only turns one way. |
| ESLint `no-restricted-imports` | A layer reaching up (a primitive importing the store), or a screen reaching inside the system | Move the logic to the right layer, or import from `…/design-system` |
| `pnpm visual` | A screen changed | If you meant it, accept it with `pnpm visual:baseline` after review. If you didn't, it's a regression. |

## 7. Design tools

The tokens and components in code are the source of truth. Design tools hold synced copies.

- **Claude Design** is for everyday screens. The team's Countersign design-system project holds these docs, the tokens and the components, synced after each merge, so a design generated there starts from what's really in the product.
- **Figma** is for new components that need exploration first. A new component designed in Figma comes through section 2 like any other, and it's done when section 3 is.
- A design that needs a value off the scale or a new colour is a system change. Bring it to the system's owner before it reaches a screen.

## 8. Working with AI

AI writes much of the code, so the system has to be legible to it and checked after it:

- **Context:** `CLAUDE.md` carries the rules every Claude Code session loads. Point prompts at [components.md](components.md): "Build the panel with Countersign. Check components.md first. Tokens only."
- **Checks over reading:** review an AI-written pull request by its `pnpm ds:audit` and `pnpm visual` results first, then read the diff for intent. Nobody can read every line of CSS from a dozen engineers and their assistants.
- **Migrations are scripts:** a change across many files (like `scripts/ds-migrate-tokens.mjs`, which moved 1,990 values to tokens) is written as a script that's safe to run again, and proven by `pnpm visual`, not done by hand.

## 9. Ownership and rhythm

- **The designer owns what the system means:** names, semantics, the token scales, and the call on every off-scale value. Engineers can add and change components following this page, with a design review on the pull request.
- **Weekly, 15 minutes:** read `pnpm ds:audit`, and pick the next item from the backlog in [audit.md](audit.md).
- **Each sprint, each squad pays down one item:** migrate one group of copies, retire one raw value, or remove one import across features. The ratchet keeps the gain.
