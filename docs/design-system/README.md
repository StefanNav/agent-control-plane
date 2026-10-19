# Countersign

Countersign is the design system behind Agent Control Plane: about 50 screens across seven roles, from the agent owner's board to the risk manager's audit trail. It's small on purpose: one set of tokens, 26 primitives, 10 product components, and the rules for how they mean what they mean.

This page is the front door. If you only read one other page, read **[contributing.md](contributing.md)**: how to add to the system without breaking it.

| Page | What it's for |
|---|---|
| [components.md](components.md) | Every primitive and product component: what it's for, when not to use it, its props, states and accessibility |
| [contributing.md](contributing.md) | How to add or change something, the definition of done, and what the checks mean when they fail |
| [audit.md](audit.md) | Where the system stood on 19 Oct 2026, what drifted and why, what changed, and the backlog with numbers |
| [../design-handoff.md](../design-handoff.md) | The original design handoff the system was built from |

## How it stays whole

A design system doesn't fail because nobody wrote it down. It fails when the quickest way to ship a screen is to work around it: copy a block of CSS, type a value, reach into another feature's folder. On a small team shipping fast with AI, that happens dozens of times a week, and nobody can review it all.

So Countersign leans on four things, in this order:

1. **The system is the easy path.** Every value a screen needs is a token, and every repeated piece is a component with a name an engineer (or an AI) can find in [components.md](components.md).
2. **The rules are written where people and AI read them.** The short version is in the repo's `CLAUDE.md`, which every Claude Code session loads. The long version is [contributing.md](contributing.md). The same pages are synced to the team's Claude Design project.
3. **Machines check what reviews miss.**
   - `pnpm ds:audit` counts the debt (typed values, copied blocks, raw elements, imports across features), and its baseline is a ratchet: the build fails if a count rises.
   - ESLint enforces the layers.
   - `pnpm visual` compares 100 screens pixel for pixel, so a component change shows every screen it reached.
4. **One owner, open contribution.** The designer owns what components mean and how they're named. Anyone can add or change one by following [contributing.md](contributing.md), with a design review on the pull request.

The evidence for this order is in [audit.md](audit.md). Colour was enforced through tokens and components from day one, and it held almost perfectly. Spacing, type and layout patterns were left to convention, and they drifted.

## Layers

```
src/design-system   tokens and primitives; no hospital knowledge
       ↓
src/components      the 10 product components; pure: props in, callbacks out, no store
       ↓
src/features        screens; read through selectors, write through store actions
```

Each layer imports only from the layers above it in this list. ESLint fails the build otherwise, and screens import the design system only through its front door (`src/design-system/index.ts`), so its insides can change. A feature never imports from another feature's folder: shared UI moves into the system, shared logic into `src/store` or `src/lib`. The audit counts the imports that still do, so that number can only go down.

## Foundations

All tokens live in `src/design-system/tokens.css`, light and dark. Two scoped files hold tokens only one area may use: `tokens-ehr.css` (the Epic stand-in) and `src/prototype/brand-tokens.css` (the Attune mark). The audit counts any use outside their scope.

### Colour means something

| Colour | Tokens | Means | Never |
|---|---|---|---|
| Indigo | `--cs-acc`, `--cs-acc-fill`, `--cs-sel` | The primary action, and "current" or "selected" | Decoration, links in running text |
| Teal | `--cs-rev` | A review is waiting for a person | Anything else |
| Amber | `--cs-warn`, `--cs-warn-text` | Warning: needs attention soon | Emphasis |
| Red | `--cs-crit` | Critical: needs a person now | Emphasis, errors that aren't critical |
| Grey | `--cs-ink` to `--cs-off` | Everything healthy | |

Every status pairs **colour + shape + word** (`StatusChip`), so it reads in greyscale and to a screen reader. A dashed line means "no data" (stale) and nothing else. No gradients, no emoji, no coloured left-border cards. Healthy stays grey, so colour appears only where a person must act.

### Type roles

IBM Plex Sans and Mono, weights 400 and 600 only, tabular numbers everywhere. Each role is a size and a line height:

| Role | Tokens | Size / line | Used for |
|---|---|---|---|
| Title | `--cs-type-title-*` | 24 / 32 | Page titles |
| Stat | `--cs-type-stat-*` | 20 / 28 | Stat values |
| Section | `--cs-type-section-*` | 18 / 24 | Section, modal and hard-stop titles |
| Body | `--cs-type-body-*` | 16 / 24 | Forms and signing, field text, card titles (600) |
| UI | `--cs-type-ui-*` | 14 / 20 | UI text, buttons, tabs, nav, notes |
| Dense | `--cs-type-dense-*` | 13 / 18 | Monitoring tables and boards, compact chips |
| Meta | `--cs-type-meta-*` | 12 / 16 | Meta, sub-lines, mono IDs and times, labels |

Density follows the work: **monitoring screens run at 13 px, forms and signing at 16 px with 44 px fields.**

### Space, radius, motion and layers

- **Space:** `--cs-space-2` to `--cs-space-56`, named by value: 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56. A value off this list is a decision. Write down why, and `pnpm ds:audit --list rawSpacing` will show it to the next person.
- **Radius:** `--cs-radius-1` ladder segments · `-2` chips, rule tags, hard stop · `-3` buttons, fields, pills, menus · `-4` instruction well · `-6` cards, paper, modals, side panels · `-8` outer frame · `-round` avatars.
- **Elevation:** only menus (`--cs-shadow-menu`) and modals (`--cs-shadow-modal`, on `--cs-scrim`) have shadows.
- **Motion:** rows fade their background (`--cs-motion-row`, 150 ms). Nothing else moves in the product, and nothing moves under reduced motion.
- **Layers:** `--cs-layer-menu` 20, `--cs-layer-modal` 50, `--cs-layer-skip-link` 70. The prototype's tour and story panel sit between 55 and 80.

## Components

**26 primitives** in `src/design-system/primitives` (Button, Field, Table, Modal, SidePanel…) and **10 product components** in `src/components` (StatusChip, AutonomyLadder, AgentTable, PrivilegeCard…). Every one is listed in [components.md](components.md), and every one is shown in its states, light and dark, at `/about/components` on the live prototype.

## Commands

| Command | What it does |
|---|---|
| `pnpm check` | Typecheck, lint (including the layer rules), unit tests (including the ratchet), build |
| `pnpm ds:audit` | The debt report, compared with the baseline. `--list <metric>` shows every place; `--write` locks a gain in |
| `pnpm visual:baseline` | Takes the screenshot baseline. Run it on `main`, before you change anything |
| `pnpm visual` | Compares 100 screens with the baseline and lists every one that changed |
