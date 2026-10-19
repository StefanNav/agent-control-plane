# Components

This is the catalogue of Countersign, the design system behind Agent Control Plane. It has three layers: tokens and primitives in `src/design-system` (no hospital knowledge), the 10 product components in `src/components` (pure: props in, callbacks out, no store), and the screens in `src/features`, which compose both. Look here before writing CSS in a feature: if a piece below does the job, use it, and if none does, read `docs/design-system/contributing.md` first.

How to read the sections:

- **Props that matter** lists only the props that change meaning or look. Native attributes pass through where the section says so.
- **States** lists only what the code implements. A piece with no hover style has no hover listed.
- **Used in** counts files under `src/features`, `src/layout` and `src/prototype` that render the piece (tests excluded). The count includes the component gallery at `/about/components` (`src/prototype/ComponentGallery`), which shows every piece in light and dark.
- Focus rings are global: after Tab or an arrow key, every focusable element gets a 2 px ink outline (`global.css`, switched on by `installKeyboardFocusMode` in `src/design-system/focus.ts`). A mouse click hides them again.

## Pick the right piece

| You need | Use | Instead of |
|---|---|---|
| A status that needs a human (review, warning, critical, no data) | StatusChip | Coloured text or a custom badge |
| A healthy state in a status column | StatusChip `status="normal"` with `align` | An empty cell |
| The main action on a page, card or dialog | Button `variant="primary"` | A second indigo style |
| An action this person isn't allowed to take | Button with `locked="<reason>"` | Native `disabled` (drops out of the tab order and gives no reason) |
| Navigate to another route | LinkButton (a real link) | Button with an `onClick` that navigates |
| Sibling pages of one record or area | Tabs with `to` on each item | Segmented |
| A view-mode switch in a header (Table, Tiles) | Segmented `variant="control"` | Tabs |
| One choice from a few options that each need a sentence | RadioCardGroup | Select |
| One choice from short, equal options in a form | Segmented `variant="choice"` | RadioCardGroup |
| One choice from a long list | Select | RadioCardGroup |
| A labelled text field | Field around Input or Textarea | A bare `<label>` and custom CSS |
| A filter toggle above a list | FilterPill (as a Menu trigger for multi-value filters) | Segmented |
| A set of actions behind one button | Menu | A row of ghost buttons |
| A key/value block on a record or form | DefinitionList | A two-column Table |
| An inline warning or explanation with a lead-in | Notice with `mark` and `lead` | A coloured box |
| A list of agents with their numbers | AgentTable | Table with hand-built columns |
| Any other list of rows people scan, select or open | Table | A `<div>` list with custom row CSS |
| An event log (time plus what happened) | LogRow inside a Card | Table |
| The steps of one agent action, to the millisecond | ActionTrace | LogRow |
| An agent's level of autonomy | AutonomyLadder (compact in rows, wide for branches, full on a record) | A text label alone |
| One privilege record as a summary | PrivilegeCard | Card with custom content |
| A rule the agent can't break, or advisory prompt text | HardStopCard or InstructionCard | Notice |
| Which systems an agent may read, draft, write or submit to | SystemsVerbsGrid | Table of checkboxes |
| Confirming a pause with its impact | PauseDialog | Modal with custom content |
| Any other confirmation or short form that must finish first | Modal | A custom overlay |
| Whether a board's data is fresh | MonitorHealth | A timestamp alone |
| A row of headline numbers | StatStrip | Cards in a grid |
| A small trend in a row or tile | Sparkline | A chart library |
| A rule or policy ID inside text | RuleTag | Mono text with a custom border |
| Progress through a multi-step flow | WizardSteps | Tabs |
| A form or signing sheet | Paper | Card |
| The card beside a page's main column, with a title and meta lines | SidePanel | Card with its own head CSS |
| A plain white surface that groups content | Card | A `<div>` with its own border |
| Text only screen readers need | VisuallyHidden | `display: none` (hides it from everyone) |

## Primitives

All primitives import from `src/design-system` (the barrel `index.ts`). They use only `--cs-*` tokens and know nothing about hospitals.

### Icon

The nine Countersign marks, drawn as inline SVG.

**Use when** you need one of the marks next to text: a lock on a locked column, a check on a done step.
**Don't use when** you are showing a status: use StatusChip, which pairs the shape with its colour and word. There is no icon library, so don't draw new shapes in a feature.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `name` | `ring`, `diamond`, `triangle`, `stale`, `shadow`, `paused`, `check`, `lock`, `chevron` | required | The shape. Ring is review, diamond is warning, triangle is critical, stale is a dashed square (no data). |
| `size` | number (px) | `12` | Width and height. Chevron uses a 10 × 10 viewBox, the rest 12 × 12. |
| `color` | any CSS colour, normally a `var(--cs-*)` token | `currentColor` | Fill or stroke. |
| `title` | string | none | Turns the icon into an image with this name. |

**States:** none. `stale` is the only dashed shape, so dashed always means "no data".

**Accessibility:** decorative by default (`aria-hidden`). With `title` it becomes `role="img"` with an SVG `<title>`. Most uses are decorative, so the text beside the icon must carry the meaning.

**Used in:** 31 files (board, onboarding).

### Button

A `<button>` for an action on the current page: save, confirm, open a dialog, pause.

**Use when** the click changes something or opens something here.
**Don't use when** it goes to another route: use LinkButton.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `variant` | `primary`, `secondary`, `ghost`, `blocked` | `secondary` | Primary is the indigo fill, kept for the main action. Secondary is white with a strong line. Ghost is borderless `text2`, 32 high. Blocked is the grey can't-use look. |
| `size` | `md`, `sm` | `md` | `md` is a page button (36 high, ghost 32). `sm` is an in-card button (32 high, 13 px). |
| `locked` | string, the reason | none | Draws the designed locked state: blocked look plus a lock icon. |
| `icon` | ReactNode | none | Drawn before the label. |
| `type` | `button`, `submit` | `button` | Native button type. |

Other native button attributes pass through, including `ref` (so it can be a Menu trigger) and `data-story-target`.

**States:**
- Locked: blocked look, lock icon, the reason shown as a tooltip and announced. Clicks do nothing.
- Blocked: grey fill, `meta` text, `not-allowed` cursor. Clicks do nothing. Use it for "not ready yet" (for example, a required reason is empty).
- Focus: keyboard ring. There is no hover style.

**Accessibility:** native `<button>`, `type="button"` unless set. Blocked and locked set `aria-disabled="true"` instead of `disabled`, so the button stays in the tab order. Locked adds `title` and an `aria-describedby` that points to the reason.

**Used in:** 52 files (onboarding, settings).

### LinkButton

A React Router link that looks like a Button.

**Use when** the click goes to another route ("Open division", "Review 3 drafts").
**Don't use when** the click changes state or opens a dialog: use Button. LinkButton has no `blocked` variant and no `locked` state.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `to` | route string | required | Where it goes. |
| `variant` | `primary`, `secondary`, `ghost` | `secondary` | Same looks as Button. |
| `size` | `md`, `sm` | `md` | Same sizes as Button. |
| `icon` | ReactNode | none | Drawn before the label. |
| `data-story-target` | string | none | Names the link for the tour. |

Only these props (plus `className`) reach the link: `aria-*`, `onClick` and `title` are not passed through.

**States:** keyboard focus ring only.

**Accessibility:** a real `<a href>`, so it reads as a link, Enter follows it, and the browser can open it in a new tab.

**Used in:** 30 files (board, golive).

### Field

A form row: label, optional hint, optional help, then the control.

**Use when** you put an Input, Select or Textarea in a form.
**Don't use when** the control is a Checkbox (it carries its own label) or a RadioCardGroup or Segmented (give those an `aria-label`: a `<label for>` can't name a `<div>` group).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `label` | ReactNode | required | 14/600 label. |
| `htmlFor` | string | required | The `id` of the control inside. |
| `hint` | ReactNode | none | Right-aligned note on the label row, such as "Required" or "5 of 7". |
| `help` | ReactNode | none | A 14 px `meta` line between the label and the control. |

**States:** none of its own.

**Accessibility:** renders a real `<label htmlFor>`. `hint` and `help` are not linked to the control with `aria-describedby`.

**Used in:** 20 files (settings, audit).

### Input

A single-line text field at form density: 16/24 text, at least 44 px high.

**Use when** a person types a short value in a form.
**Don't use when** the text runs to sentences (use Textarea) or the answer is one of a fixed set (use Select, RadioCardGroup or Segmented).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `locked` | boolean | `false` | A value set elsewhere: neutral fill, `line` border, lock icon, read-only. |

All native input attributes pass to the `<input>`. `className` goes to the wrapping box.

**States:**
- Locked: read-only, still focusable, so the value can be selected and read.
- Focus: the ring is drawn on the box (`:focus-within`), not on the inner input.

**Accessibility:** native `<input>`. Label it with Field or `aria-label`.

**Used in:** 9 files (settings, review).

### Select

A native `<select>` in the field box, with a chevron.

**Use when** a person picks one value from a longer list, or space is tight.
**Don't use when** there are only a few options that each need explaining: use RadioCardGroup. For short, equal options, use Segmented.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `value` | string union `T` | required | The chosen value. |
| `onChange` | `(value: T) => void` | required | Called with the value, not the event. |
| `options` | `{ value, label }[]` | required | The choices, in order. |
| `locked` | boolean | `false` | Neutral fill, lock icon in place of the chevron, native `disabled`. |

**States:**
- Locked: disabled. Unlike a locked Input, it leaves the tab order.
- Focus: ring on the box.

**Accessibility:** native select (combobox role) with native keyboard behaviour. Label it with Field or `aria-label`.

**Used in:** 11 files (settings, onboarding).

### Textarea

A native multi-line text field: 16/24 text, at least 108 px high, resizable vertically.

**Use when** a person writes a reason or a note ("Why are you pausing?").
**Don't use when** the answer is one line: use Input.

**Props that matter:** none of its own. All native textarea attributes pass through; set `rows` or a class for a shorter box.

**States:** focus ring only. There is no locked state.

**Accessibility:** native `<textarea>`. Label it with Field.

**Used in:** 21 files (onboarding, review).

### Checkbox

One independent yes/no, with an optional description line.

**Use when** a person confirms or turns on one thing (accepting a signing statement).
**Don't use when** they pick one of several options (use RadioCardGroup) or toggle a list filter (use FilterPill).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `checked` | boolean | required | Checked draws a deep indigo box with a white check, in both themes. |
| `onChange` | `(checked: boolean) => void` | required | Called with the new value. |
| `label` | ReactNode | none | 16/24 label. |
| `description` | ReactNode | none | 14 px `meta` line under the label. |
| `disabled` | boolean | `false` | `off` text, `not-allowed` cursor, ignores clicks and keys. |

**States:** checked, disabled, keyboard focus.

**Accessibility:** a `<button role="checkbox">` with `aria-checked`; its name comes from the label text. Click and Space toggle it (tested); as a native button, Enter does too. Disabled sets `aria-disabled`, so it stays focusable.

**Used in:** 9 files (audit, promotion).

### RadioCardGroup

A set of radio cards: one choice, each option with a title and an optional sentence.

**Use when** a person picks one of a few options and needs to understand each (pause scope, risk tier).
**Don't use when** the options are short and equal (use Segmented) or many (use Select).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `value` | `T` or `null` | required | The chosen value. `null` means none yet. |
| `onChange` | `(value: T) => void` | required | Called with the chosen value. |
| `options` | `{ value, title, description?, disabled? }[]` | required | The cards, in order. |
| `name` | string | required | Stored as `data-name` on the group. |
| `aria-label` | string | none | The group's name. Always set it. |
| `columns` | number | stacked | Lays the cards side by side, for example 4 tiers in a row. |

**States:**
- Checked: 1.5 px indigo border, selection tint, indigo dot, 600 title.
- Disabled option: `off` text, `not-allowed` cursor, skipped by the arrow keys.

**Accessibility:** `role="radiogroup"` with `role="radio"` cards (`aria-checked`, `aria-disabled`). One tab stop: the checked card, or the first enabled one. Arrow Down and Right select the next enabled card, Up and Left the previous, wrapping round. Space and Enter select the focused card.

**Used in:** 6 files (review, onboarding).

### Segmented

A row of segments with one on. Two looks: an equal-grid choice for forms, and a compact switch for headers.

**Use when** `choice`: picking between short, equal options in a form (Tier 2, Tier 3). `control`: switching how a view shows its content (the division board's Table, Tiles, Exceptions first).
**Don't use when** the segments are separate pages: use Tabs with `to`.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `variant` | `choice`, `control` | `choice` | `choice` is an equal grid of radio-card-like cells (14 px). `control` is a compact switch on a sunk track (13 px). |
| `value` / `onChange` | `T`, `(value: T) => void` | required | The segment that is on, and the change callback. |
| `options` | `{ value, label, sub? }[]` | required | `sub` is a 12 px line, shown only in `choice`. |
| `aria-label` | string | none | The group's name. |
| `disabled` | boolean | `false` | Shows the choice but can't change it (read-only viewers). |

**States:**
- On, `choice`: 1.5 px indigo border, selection tint, 600 label.
- On, `control`: selection tint, a strong-line inset ring, ink 600 label.
- Disabled: every segment `aria-disabled`, clicks ignored, `not-allowed` cursor.

**Accessibility:** `role="group"` with `aria-label`; each segment is a `<button aria-pressed>`. Tab moves between segments. There is no arrow-key handling.

**Used in:** 5 files (board, review).

### FilterPill

A 32 px toggle for a list filter.

**Use when** a filter above a list turns on or off, or opens a Menu of values ("Agent: any").
**Don't use when** you are switching between views (use Segmented `control`) or pages (use Tabs).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `on` | boolean | required | On draws an ink border and ink 600 text (not indigo). |
| `onClick` | `() => void` | required | Called on click. |
| `aria-haspopup`, `aria-expanded`, `ref` | native | none | Set these when the pill is a Menu trigger. |

**States:** on, keyboard focus. There is no hover style.

**Accessibility:** a `<button>` whose `aria-pressed` mirrors `on`. When `aria-haspopup` is set, `aria-pressed` is dropped and the caller sets `aria-expanded`.

**Used in:** 5 files (audit, inventory).

### Card

A white surface with a 1 px `line` border and 6 px radius. Content inside clips to the corners.

**Use when** you group content on a page: a list of LogRows, a tile. For the card beside a page's main column, use SidePanel.
**Don't use when** it holds a form someone fills in (use Paper). Table, StatStrip and the product components already draw their own card.

**Props that matter:** none of its own. Native `<div>` attributes pass through.

**States:** none.

**Accessibility:** a plain `<div>` with no role. Add a heading or `aria-label` inside if the group needs a name.

**Used in:** 9 files (board, audit).

### Paper

The form sheet: white, 1 px `line-strong` border, 6 px radius, padding 28 32 32, 28 px gap between children.

**Use when** you lay out a form or signing sheet.
**Don't use when** you only group content: use Card.

**Props that matter:** none of its own. Native `<div>` attributes pass through.

**States:** none.

**Accessibility:** a plain `<div>` with no role.

**Used in:** 1 file (the component gallery). No screen renders it yet; current form screens draw their own sheets.

### DefinitionList

Key/value rows at reading density: 14 px `meta` keys, 16/24 values, rows divided by a `line`.

**Use when** a record or form shows facts as pairs (Granted by, Review).
**Don't use when** the data has many rows of the same shape (use Table). Product components draw their own denser fact rows, so don't nest a DefinitionList in them.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `items` | `{ key, value }[]` | required | The pairs, in order. Values can hold several lines. |
| `keyWidth` | number (px) | `160` | Width of the key column. |

**States:** none.

**Accessibility:** a real `<dl>`; each pair is a `<div>` holding a `<dt>` and a `<dd>`.

**Used in:** 6 files (onboarding, review).

### Notice

An inline message on a sunk panel: an optional mark, a bold lead-in in ink, then text in `text2`.

**Use when** a screen needs to explain or warn in place: a refusal, a rule, a stale feed.
**Don't use when** you are marking the status of a row or record: use StatusChip.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `mark` | `warn`, `crit`, `review`, `stale`, `lock`, `none` | `none` | Amber diamond, red triangle, teal ring, dashed square, grey lock, or no mark. |
| `lead` | ReactNode | none | Bold lead-in before the text. |
| `actions` | ReactNode | none | Ghost buttons under the text. |

To match a notice to a status, use `noticeMark(status)` from `src/components`: crit, warn, review and stale keep their mark, everything else gets `none`. The teal `review` mark is for review waiting only.

**States:** none.

**Accessibility:** a plain `<div>` with no `role="status"` or `alert`, so it isn't announced when it appears. The mark is decorative, so the lead must say what kind of notice it is ("Not paused.").

**Used in:** 34 files (onboarding, review).

### StatStrip

A card of equal cells, each with a label (13 `meta`), a value (20/600) and an optional sub-line (12 `meta`).

**Use when** a page leads with a few headline numbers ("Signed as is 82%, target 80%").
**Don't use when** the numbers belong to rows (use Table) or show change over time (use Sparkline).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `stats` | `{ label, value, sub? }[]` | required | One cell per stat, equal widths. |

**States:** none.

**Accessibility:** plain spans read in order: label, value, sub. No table semantics.

**Used in:** 4 files (board, evidence).

### Sparkline

A small SVG trend line with an end dot.

**Use when** a row or tile shows the shape of recent values (7-day acceptance).
**Don't use when** it would be the only place a number appears: put the value in text too.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `values` | number[] | required | Fewer than two values draws nothing. |
| `width` / `height` | number (px) | `72` / `20` | Box size. Rows use smaller boxes (AgentTable uses 52 × 16). |
| `stale` | boolean | `false` | No data: dashed line in `off`, no end dot. |
| `endDot` | boolean | `true` | Paused rows hide it. |
| `domain` | `[min, max]` | the values' own range | A fixed scale, for example `[75, 100]` for acceptance. |
| `color` | a `var(--cs-*)` token | `text2` | Grey by default. Screens pass a warning token only when the trend is a warning. |

`strokeWidth` (1.5) and `dotRadius` (2) can be reduced for dense rows.

**States:** stale (dashed), paused (no end dot).

**Accessibility:** the SVG is `aria-hidden`.

**Used in:** 5 files (board, reviewers).

### ProgressBar

A 4 px grey bar: `line` track, `text2` fill.

**Use when** you show how much of a target or a set is done ("5 of 7").
**Don't use when** the value is a status: it has no warning colour. Use StatusChip or Notice.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `value` | number from 0 to 1 | required | Clamped to 0..1. |
| `label` | string | none | The accessible name. Always set it. |
| `width` | number (px) | `56` | Track width. |

**States:** none.

**Accessibility:** `role="progressbar"` with `aria-valuemin="0"`, `aria-valuemax="100"` and `aria-valuenow` as a rounded percentage. `label` becomes `aria-label`.

**Used in:** 4 files (onboarding, stepdown).

### RuleTag

A rule or policy ID in mono 12, with a 1 px `line-strong` inset ring and 2 px radius (`HS-04 v2`).

**Use when** text names a rule, policy or version the gateway enforces.
**Don't use when** you are showing a status (use StatusChip) or a record ID line in a page header (use PageHeader's `idLine`).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `children` | string | required | The ID and version, for example "HS-04 v2". |

**States:** none.

**Accessibility:** a plain `<span>`; the ID is read as text.

**Used in:** 22 files (onboarding, board).

### LogRow

One event: a 64 px mono time column, then the text (14/20) and an optional 13 px `meta` sub-line.

**Use when** you list events in time order: an activity log, a history tab. Put the rows in a Card.
**Don't use when** the rows are selected or opened (use Table) or replay one action step by step (use ActionTrace).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `time` | string | required | Mono time, for example "09:47". |
| `children` | ReactNode | required | What happened. |
| `sub` | ReactNode | none | Who or why, in `meta`. |

**States:** none.

**Accessibility:** a plain `<div>`. It has no list semantics of its own.

**Used in:** 5 files (board, inbox).

### Avatar

A grey circle with a person's initial.

**Use when** you mark the signed-in person, as the top nav does.
**Don't use when** you need the person's name: write the name.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `initial` | string | required | The letter shown. |
| `size` | number (px) | `28` | Diameter. |

**States:** none.

**Accessibility:** a plain `<span>`; the initial is read as text.

**Used in:** 2 files (layout/TopNav, the gallery).

### Table

The list of rows: a card with a mono uppercase header row, rows on a CSS grid, selection and keyboard movement built in.

**Use when** people scan, select or open rows: inventories, people, branches, scorecards.
**Don't use when** the rows are agents on a division board (use AgentTable), pairs of facts (use DefinitionList) or an event log (use LogRow).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `columns` | `Column<Row>[]` | required | Each has `id`, `header`, `width` (a grid track such as `'304px'` or `'1fr'`), `render`, optional `align: 'right'` for numbers and `hiddenHeader` (a screen-reader name for an empty header). |
| `rows` / `getRowId` | `Row[]`, `(row) => string` | required | The data and its stable IDs. |
| `ariaLabel` | string | required | The table's name. |
| `selectedId` / `onSelect` / `onOpen` | string, callbacks | none | Click selects, double-click opens. |
| `selectOnFocus` | boolean | `false` | Focusing a row selects it, so a side panel follows the keyboard. |
| `density` | `default`, `board` | `default` | `default` rows are at least 56 px (44 plus 6 px padding top and bottom). `board` rows are at least 32 px with no vertical padding. |
| `textSize` | `13`, `14` | `13` | Body text size. |
| `minRowHeight` / `headHeight` | number (px) | none / 32 | Override row and header heights. Most screens set `minRowHeight` to match their frame (48 to 85 px). |
| `groups` | `{ id, label, count?, rowIds }[]` | none | Rows listed in a group render under a sunk group header; the rest follow. |
| `isMuted` | `(row) => boolean` | none | Draws a row in `meta` (for example, resolved items). |
| `hideHeader` / `columnGap` | boolean, number | `false` / `16` | Hide the header row; change the column gap. |

**States:**
- Hover: `hover` tint, 150 ms (off under reduced motion).
- Selected: selection tint and a 2 px indigo bar on the left edge.
- Muted: `meta` text.
- Focus: 2 px ring inset by 2 px.

**Accessibility:** `<div>` grid with `role` table, row, columnheader, cell and rowgroup, named by `ariaLabel`. Every body row is a tab stop with `aria-selected`. Arrow Up and Down move focus between rows, across groups. Enter and Space call `onOpen`, or `onSelect` when there is no `onOpen`. Keys pressed in a control inside a cell (a link, a button, an input) stay with that control.

**Used in:** 25 files (board, review).

### Tabs

A 40 px row of tabs; the current one is ink 600 with a 2 px indigo underline.

**Use when** a record or area has sibling pages (Board, Inbox), or a page switches between panes.
**Don't use when** you switch a view's display mode in a header (use Segmented `control`) or move through a form (use WizardSteps).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `items` | `{ id, label, to? }[]` | required | With `to` a tab is a link; without it, a button that calls `onSelect`. |
| `current` | string | required | The `id` of the current tab. |
| `onSelect` | `(id) => void` | none | Called by button tabs. |
| `ariaLabel` | string | required | The `<nav>` name. |

**States:** current, keyboard focus.

**Accessibility:** a `<nav aria-label>`. Linked tabs are links, and the current one has `aria-current="page"`. Button tabs use `aria-pressed`. It is not an ARIA tablist: Tab moves between tabs and there are no arrow keys.

**Used in:** 14 files (board, evidence).

### WizardSteps

An equal grid of step cells, each with a mark, a label and a sub-line naming who and when.

**Use when** a flow has ordered steps with owners (onboarding, the review packet).
**Don't use when** the views are peers: use Tabs.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `steps` | `{ id, label, sub, mark }[]` | required | One cell per step. |
| `mark` | `done`, `todo`, `locked`, `review`, `none` | required per step | Check, 14 px box, lock, teal ring (review waiting), or no mark. `locked` and `none` (not started) mute the label. |
| `current` | string | required | The current step's `id`. |
| `onSelect` | `(id) => void` | none | Makes each step a button. |

**States:** current (selection tint, 2 px indigo underline, 600 label), muted (locked or not started).

**Accessibility:** an `<ol>`; the current `<li>` has `aria-current="step"`. Marks are decorative, so say the state in words in `sub` ("Dana · done 01 Oct").

**Used in:** 3 files (onboarding, review).

### Menu

A dropdown panel of grouped items behind a trigger you render.

**Use when** several actions or choices sit behind one button: agent controls, filter values, the persona switcher.
**Don't use when** a few options can stay visible (use Segmented or RadioCardGroup) or it is a form value (use Select).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `trigger` | `({ open, toggle, ref }) => ReactNode` | required | Render a Button or FilterPill; pass it `ref` and `toggle`. |
| `groups` | `{ label?, items }[]` | required | Groups after the first get a divider; a label uses the mono label style. |
| item `locked` | boolean | `false` | Not allowed for this person: `off` text, lock icon, does nothing. |
| item `selected` | boolean | `false` | The current choice: selection tint, indigo bar, 600 label. |
| item `sub` | ReactNode | none | 12 px `meta` line under the label. |
| `align` / `placement` | `left`, `right` / `below`, `above` | `left` / `below` | `above` is for a bar at the foot of the window. |
| `width` | number (px) | `280` | Panel width. |

**States:** hover and focus tint, selected, locked.

**Accessibility:** `role="menu"`, groups `role="group"` with `aria-label`, items `role="menuitem"`. Opening focuses the first item. Arrow Up and Down move and wrap. Enter and Space choose. Escape closes, returns focus to the trigger and stops there, so a Modal around it stays open. Tab or a click outside closes it. The trigger sets its own `aria-expanded` and `aria-haspopup`. `selected` is visual only (no `aria-checked`). Locked items have `aria-disabled`.

**Used in:** 8 files (audit, inbox).

### Modal

A centred dialog on a scrim, with a head, a scrolling body and a sunk footer for the audit stamp and buttons.

**Use when** a consequential action needs a confirmation or a reason before the person goes back to the page.
**Don't use when** you are pausing an agent (use PauseDialog) or the content should stay beside the page (use a side column in a Split layout).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `open` / `onClose` | boolean, `() => void` | required | Escape calls `onClose`. |
| `title` | ReactNode | required | An 18/600 `<h2>`; it names the dialog. |
| `description` | ReactNode | none | A line under the title. |
| `actions` | ReactNode | required | Buttons, right of the footer. |
| `audit` | ReactNode | none | Mono stamp left of the footer ("Logs Marcus · 09:47"). |
| `footNote` | ReactNode | none | A plain status line in place of the audit stamp. |
| `width` | number (px) | `600` | Dialog width. |

**States:** open or closed. Clicking the scrim does not close it, so a half-typed reason is never lost.

**Accessibility:** rendered in a portal on `<body>`, with `role="dialog"`, `aria-modal="true"` and `aria-labelledby` pointing to the title. On open, focus moves to the first focusable element (or the dialog). Tab and Shift+Tab cycle inside it and through any `[data-modal-companion]` region (the tour's story panel). Focus that lands anywhere else is pulled back. Page scroll is locked while open, and focus returns to the opener on close. `description` is not linked with `aria-describedby`.

**Used in:** 16 files (audit, settings).

### VisuallyHidden

A `<span>` that screen readers read and nobody sees.

**Use when** a shape or an empty header carries meaning the eye gets but a screen reader wouldn't: an icon-only column, a locked button's reason.
**Don't use when** the text should be hidden from everyone: don't render it.

**Props that matter:** none of its own. Native `<span>` attributes pass through (`id`, `aria-hidden`).

**States:** none.

**Accessibility:** clipped to 1 px but kept in the accessibility tree.

**Used in:** 4 files (onboarding, changes).

### SidePanel

The 340 px card beside a page's main column: a title, meta lines under it, the caller's body, and ruled blocks for notes and next steps. It follows the design source's `side`, `sideHead` and `sBlock`.

**Use when** a page has a main column and a side column that explains, summarises or holds the next action: onboarding's "What starting does", the committee packet's decision, the risk tier's "What the tier sets".
**Don't use when** the content is the page's main task (use Card or Paper), or it is a list of records (use Table).

**Props that matter:**

| Prop | Type | Default | What it does |
|---|---|---|---|
| `title` | `ReactNode` | required | The panel's h2: 16/24, 600, ink. |
| `sub` | `ReactNode \| ReactNode[]` | none | Meta lines under the title, 14/20 meta, 2 px apart. Pass an array for several lines. |
| `label` | `string` | none | Names the panel as a region (complementary with `as="aside"`). Leave it out for a plain section. |
| `foot` | `ReactNode` | none | A ruled block after the body. Bold text inside it is ink. |
| `as` | `'section' \| 'aside'` | `'section'` | `aside` when the panel supports the page rather than being part of its task. |

Native attributes (such as `data-story-target`) pass through. `SidePanelBlock` is the same ruled block as `foot`, for use anywhere in the body.

**States:** none of its own.

**Accessibility:** the title is always an h2. With `label` the panel is a landmark the screen reader can jump to; without it, it is a plain section.

**Used in:** 7 files (onboarding, review), plus the gallery. Seven other features still draw their own copy with small differences from this spec; see `docs/design-system/audit.md`.

## Product components

All product components import from `src/components`. Each takes ready-to-show text (counts, times and dashes arrive formatted) and reports clicks through callbacks. None reads the store; screens build the props with selectors.

### StatusChip

A status shown as colour, shape and word together (component 01). Healthy is just the word, in grey.

**Use when** a row, header or card shows a state a person may need to act on.
**Don't use when** the text is plain metadata (write it), or the subject is a board's data feed (use MonitorHealth).

| Prop | Values | Default | Effect |
|---|---|---|---|
| `status` | `normal`, `review`, `warn`, `crit`, `stale`, `shadow`, `paused` | required | Picks the shape, border and text colour below. |
| `label` | string | required | The word. It must name the state ("No data for 3h", not "3h"). |
| `size` | `compact`, `header`, `comfortable` | `compact` | 22 px high at 13 px (boards and tables), 24 px at 14 px (page headers), 30 px at 16 px with a 15 px icon (forms and signing). |
| `muted` | boolean | `false` | Resolved: solid `line` border, `off` icon, `meta` 400 text. |
| `align` | boolean | `false` | Draws `normal` inside an invisible chip with icon space, so its word lines up with outlined chips in a column. |

| Status | Shape | Border | Text |
|---|---|---|---|
| normal | none | none | `meta` 400, plain word |
| review | teal ring | 1 px teal | teal 600 |
| warn | amber diamond | 1 px amber | amber text 600 |
| crit | red triangle | 1 px red | red 600 |
| stale | dashed square | 1 px dashed grey | `strong` 600 |
| shadow | half-filled ring | 1 px `line-strong` | `meta` 400 |
| paused | pause bars | 1 px `line-strong` | `meta` 400 |

**States:** muted, aligned. Review, warn, crit and stale are the "needs a human" statuses and use bold text.

**Accessibility:** spans with no role. The icon is decorative, so the word is what a screen reader hears.

**Used in:** 33 files (board, review).

### AutonomyLadder

The four levels (Shadow, Draft, Supervised, Autonomous) with where an agent stands and what is proposed (component 05).

**Use when** you show an agent's or branch's level: `compact` in rows, `wide` for branches on the promotion, step-down and activity screens, `full` on the agent record and the signing page.
**Don't use when** you only need the level's name in a sentence: write it.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `variant` | `full`, `compact` | required | `full` is a 4-column card with a caption and evidence line per level. `compact` is four segments. |
| `size` | `row`, `panel`, `wide` | `row` | Compact only. `row` is 8 × 8 segments, `panel` 28 × 6, `wide` 10 px bars that fill the container. |
| `labels` | boolean | `false` | Wide only: level names under the bars, current and proposed in bold, locked with a lock. |
| `steps` | `{ level, state, caption?, evidence? }[]` | required | One per level, in order. `caption` and `evidence` show in `full` only. |
| step `state` | `passed`, `current`, `proposed`, `available`, `locked`, `held` | required | See states. |

**States** (per step):
- Compact `row` and `panel`: passed grey fill, current ink fill, proposed 1.5 px ink outline (outline, not colour, marks a proposal), available thin `off` outline, locked pale fill, held 1.5 px dashed ink outline.
- Wide: passed icon grey, current ink, proposed indigo fill, available outlined, held dashed outline, locked hatched.
- Full: current on a fill with a 600 name, proposed with a 2 px ink inset, passed with a check, locked sunk with a lock.

**Accessibility:** compact (every size) is `role="img"` with a label built from the steps, for example "Shadow current, Draft proposed"; a ladder where every step is locked reads "Locked by policy". Wide labels are `aria-hidden` because the image label covers them. Full has no role; its level names and captions are text.

**Used in:** 8 files (promotion, stepdown).

### LadderLegend

The key to the wide ladder: six swatches with their meanings, from "Granted · current level in bold" to "Locked by policy".

**Use when** a screen shows wide ladders and needs to explain them.
**Don't use when** the ladder is compact or full: those don't use the wide swatches.

**Props that matter:** none.

**States:** none.

**Accessibility:** a `<ul>` of six `<li>`; the swatches are `aria-hidden`, the words carry the meaning.

**Used in:** 2 files (promotion, the gallery).

### AgentTable

The division board's agent rows (component 02): status first, quality next to volume, then the privilege. Built on Table at board density.

**Use when** you list agents on a division board.
**Don't use when** the rows are anything other than agents with these columns: use Table.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `rows` | `AgentRowView[]` | required | Status, label, rule tag, name, version, formatted metrics, 7-day trend, ladder states, level, grantor, review date. |
| `ariaLabel` | string | required | The table's name. |
| `selectedId` / `onSelect` / `onOpen` | string, callbacks | none | As in Table. The selected agent's name is 600. |
| `selectOnFocus` | boolean | `false` | The selection follows the keyboard (the division board uses it). |
| `layout` | `full`, `withPanel` | `full` | `withPanel` narrows the columns to sit beside the 344 px agent panel. |
| `targetPrefix` | string | none | Gives each agent name `data-story-target="<prefix><id>"` for the tour. |

The columns are fixed: Status · rule ↓, Agent, 24h, Signed as is, Edited, Blocked, 7 days, Privilege.

**States** (data rules):
- Stale rows: metrics in `meta` and a dashed trend. Pass `—` as each stale metric.
- Paused rows: no trend end dot.
- A `warn` row whose label mentions "edit" shows Edited in amber text 600.
- Blocked above zero is `strong` 600.
- Hover, selected and focus come from Table.

**Accessibility:** inherits Table's roles and keys. Each row's StatusChip word and the ladder's image label are read.

**Used in:** 2 files (board, the gallery).

### ExceptionList

The inbox list (component 03): every exception names an action, an owner and a deadline.

**Use when** you list exceptions in groups with that six-column layout.
**Don't use when** the list sits in a narrow column: the inbox screen (`features/inbox`) draws its own card list for frame 5a.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `groups` | `{ id, label?, count?, items }[]` | required | Each group gets a sunk header with its label and count. |
| `ariaLabel` | string | required | The list's name. |
| `showHeader` | boolean | `false` | Adds the Type, Reason, Action needed, Owner, Deadline header. |
| `selectedId` / `onSelect` / `onOpen` | string, callbacks | none | Click selects, double-click and Enter open. |
| item `state` | `new`, `claimed`, `overdue`, `resolved`, `dismissed` | required | See states. |

**States:**
- New: a 6 px ink dot and a 600 reason.
- Claimed: no dot, regular weight.
- Overdue: a red triangle and the deadline in red 600.
- Resolved or dismissed: muted chip, the outcome replaces the action, `meta` text.
- Hover, selected (tint and indigo bar), keyboard focus.

**Accessibility:** `role="table"` with rowgroups and rows; each item is a tab stop with `aria-selected`. Arrow Up and Down move focus between items. Enter and Space call `onOpen`. The new dot has no text alternative.

**Used in:** 1 file (the gallery).

### PrivilegeCard

One privilege record as a card (component 04): status, record ID, activity, scope, compact ladder, facts, and the next step as a button.

**Use when** you show a privilege grant on an agent's or activity's page.
**Don't use when** you show many privileges as rows: use Table.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `view` | `PrivilegeCardView` | required | State, status label, code, title, scope, ladder states, ladder caption, fact rows, footnote, action label. |
| `view.state` | `awaiting`, `active`, `due`, `lapsed`, `steppedDown`, `closed` | required | Sets the mark, the status colour and the button's weight. |
| `onAction` | `() => void` | none | Called by the footer button. |

| State | Mark | Status text | Button |
|---|---|---|---|
| awaiting | teal ring | teal 600 | primary |
| active | none | `meta` | ghost |
| due | amber diamond | amber 600 | secondary |
| lapsed | half ring | `meta` | secondary |
| steppedDown | amber diamond | amber 600 | ghost |
| closed | none | `meta` | ghost |

**Accessibility:** a plain `<div>`; the mark is decorative and the status word is text. The action is an `sm` Button.

**Used in:** 3 files (board, activity).

### HardStopCard

An enforced rule (component 06): an ink header bar with a lock and "Hard stop · enforced at the gateway", a 1.5 px ink border on a filled body.

**Use when** you show a rule the gateway enforces and the agent can't change.
**Don't use when** the text is guidance in the agent's prompt: use InstructionCard. The two must look different in greyscale.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `code` | string | required | Rule ID and version, right of the bar ("HS-04 v2"). |
| `title` / `description` | string | required | 18/600 title and a 13 px description. |
| `rows` | `{ key, value }[]` | required | Facts such as Owner and Version. |
| `footer` | ReactNode | none | A footer line with a lock ("The agent can't edit or talk past this rule."). |
| `children` | ReactNode | none | Extra content under the facts, such as a 30-day test result. |

**States:** none. It is never interactive.

**Accessibility:** the title is an `<h3>`; the facts are a `<dl>`. The lock icons are decorative; the bar text says "Hard stop".

**Used in:** 2 files (onboarding, the gallery).

### InstructionCard

Advisory text in the agent's prompt (component 06): an open white card, 6 px radius, the text in a sunk well, and a fixed note that it is guidance only.

**Use when** you show prompt guidance next to, or in contrast with, hard stops.
**Don't use when** the rule is enforced: use HardStopCard. Never draw an instruction dashed.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `text` | string | required | The instruction, at 16/24. |
| `rows` | `{ key, value }[]` | required | Facts under the text; an empty array shows none. |
| `onEdit` | `() => void` | none | Shows a ghost `sm` "Edit" button in the header. |

**States:** with or without the Edit button.

**Accessibility:** plain text; the header label "Instruction · in the agent's prompt" names it. The facts are a `<dl>`.

**Used in:** 1 file (the gallery).

### SystemsVerbsGrid

Which systems an agent may read, draft, write or submit to (component 07). Sign and Order stay with people and are drawn as locked columns, with the policy named once in the footer.

**Use when** you set or review an agent's system access (onboarding, the review packet).
**Don't use when** you list tools or other permissions without these six verbs: use Table.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `rows` | `{ system, detail, cells }[]` | required | `cells` maps each verb (read, draft, write, submit, sign, order) to `granted`, `none`, `changed` or `locked`. Pass `locked` for Sign and Order. |
| `policyId` | string | required | The organisation policy, shown once as a RuleTag ("ORG-POL-02"). |
| `onToggle` | `(system, verb) => void` | none | Makes unlocked cells toggle buttons. Without it the grid is read-only. |
| `selected` | string (system name) | none | The row that needs attention: selection tint and indigo bar. |
| `policyText` / `note` / `actions` | ReactNode | default sentence / none / none | Replace the footer lead-in, add a sentence after the policy, add footer buttons. |

**States** (per cell): granted (ink square with a white check), none (empty `off` outline), changed (granted with an outer ring: needs re-approval), locked (lock on a filled column). Rows: selected.

**Accessibility:** plain `<div>` rows without table roles. Toggle cells are buttons named "System · verb" with `aria-pressed` (true for granted or changed). Locked cells are a titled image ("Sign locked by ORG-POL-02"). Read-only marks have no text, and `changed` is not announced differently from `granted`.

**Used in:** 3 files (onboarding, review).

### PauseDialog

The pause confirmation (component 08): scope first, the impact before anything stops. Built on Modal at 620 px.

**Use when** a person pauses an agent or an activity.
**Don't use when** it is any other confirmation: use Modal.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `agentName` | string | required | Title "Pause {agentName}?". |
| `scopes` / `scope` / `onScopeChange` | RadioCardGroup options, value, callback | required | The scope radio cards. |
| `effects` | `{ value, lead, text }[]` | required | The numbered "What happens" list. |
| `resumeRule` | `{ lead, text }` | required | Shown in a lock Notice. |
| `reason` / `onReasonChange` | string, callback | required | Optional reason textarea. |
| `audit` | string | required | Footer stamp ("Logs Marcus · 09:47"). |
| `error` | string or null | none | A critical Notice, "Not paused.", with the store's reason. |
| `locked` | string | none | The confirm button shows the locked state with this reason. |
| `targetPrefix` | string | none | Tour targets for the effects list and, unless locked, the confirm button. |
| `open` / `onCancel` / `onConfirm` | boolean, callbacks | required | Cancel is ghost; "Pause agent" is primary. |

**States:** open, error shown, confirm locked.

**Accessibility:** inherits Modal (named by its title, focus trapped, Escape cancels). The scope group is labelled "Scope"; the reason has a real label.

**Used in:** 2 files (controls, the gallery).

### ResumeDialog

The resume request or approval (component 08): who paused and when, who needs to sign, what each activity returns to, and a required reason. Built on Modal.

**Use when** resume is handled in a dialog.
**Don't use when** you are on the agent page: the product's resume flow is the inline `ResumePanel` in `features/controls`.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `mode` | `request`, `approve` | required | Title and button read "Request resume" or "Approve resume". |
| `agentName`, `pausedBy`, `pausedAt`, `pausedAgo` | string | required | Title and the paused line under it. |
| `needs` | `{ name, status, done }[]` | required | "Needs both" list; done draws an ink box with a check. |
| `returnsTo` | `{ activity, level }[]` | required | Each activity and the level it returns to. |
| `reason` / `onReasonChange` | string, callback | required | Required reason. |
| `statusLine` | string | required | Footer line ("Stays paused until Priya approves"). |
| `open` / `onCancel` / `onSubmit` | boolean, callbacks | required | Cancel is secondary. |

**States:** the submit button is `blocked` until the reason has non-space text, then primary.

**Accessibility:** inherits Modal. The blocked button is `aria-disabled` and ignores clicks.

**Used in:** 1 file (the gallery).

### ActionTrace

One agent action replayed step by step, with millisecond times (component 09).

**Use when** you show what an agent did and what the gateway decided, for audit.
**Don't use when** you list unrelated events over time: use LogRow.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `view` | `ActionTraceView` | required | Title, code, agent, version, SOP, acting-for, and steps. |
| step `kind` | `input`, `tool`, `policyPassed`, `policyBlocked`, `output`, `reviewer` | required | Sets the marker and the kind label. |
| `layout` | `card`, `rows` | `card` | `card` has its own head and a timeline rail. `rows` (the trace page, 7b) is ruled rows of time, kind and detail, with no head. |
| `onExport` | `() => void` | none | Card only: shows an `sm` "Export for surveyor" button. |

**States** (per step): a blocked step has its kind in red 600 and its detail in a sunk box (card) or the whole row on a neutral fill (rows). Tool titles are mono; blocked and reviewer titles are 600.

**Accessibility:** steps are an ordered list (`<ol>`). The rail markers are decorative; every step's kind is written out ("Policy check · blocked").

**Used in:** 2 files (audit, the gallery).

### MonitorHealth

The freshness of the data behind a view (component 10). Silence never looks like health.

**Use when** a board header says whether its numbers are current.
**Don't use when** the status belongs to an agent or an exception: use StatusChip.

| Prop | Values | Default | Effect |
|---|---|---|---|
| `state` | `live`, `delayed`, `stale` | required | See states. |
| `at` | string | required | Time of the last data ("09:42:17"). |
| `delayMin` | number | `0` | Delayed: minutes late. |
| `staleFor` | string | none | Stale: how long without data ("3h"). |

**States:**
- Live: a 6 px grey dot and "Live · 09:42:17" in mono `meta`.
- Delayed: a `text2` dot and "Delayed 6 min · last 09:36" in uppercase `strong` 600. No status colour.
- Stale: the stale StatusChip, "No data for 3h · last 06:41". Withdraw the numbers below it.

**Accessibility:** plain text, not a live region, so changes aren't announced.

**Used in:** 2 files (board, the gallery).

## Size and density names

Density is a system concept with three steps: monitoring screens (boards, tables) run at 13 px, UI text (buttons, tabs, notes) at 14 px, and forms and signing at 16 px with 44 px fields. The type roles in `src/design-system/type.module.css` are `dense` (13/18), `ui` (14/20) and `body` (16/24).

The props that pick a size or density today:

- Button and LinkButton: `size: 'md' | 'sm'` (page button or in-card button).
- StatusChip: `size: 'compact' | 'header' | 'comfortable'` (13, 14 and 16 px).
- AutonomyLadder: `variant: 'full' | 'compact'`, and for compact, `size: 'row' | 'panel' | 'wide'`.
- Table: `density: 'default' | 'board'` and `textSize: 13 | 14`.
- Segmented: `variant: 'choice' | 'control'` (form choice or compact switch).
- AgentTable: `layout: 'full' | 'withPanel'`. ActionTrace: `layout: 'card' | 'rows'`.
- Pixel numbers: Avatar `size` (default 28), Icon `size` (default 12), Sparkline `width` and `height`, ProgressBar `width`, Menu and Modal `width`, DefinitionList `keyWidth`.

These names are inconsistent: the same idea is called `size`, `variant`, `density` or `layout` depending on the component, and the values (`md`, `compact`, `row`, `board`) don't line up across them. `docs/design-system/contributing.md` sets the rule for naming size and density on new components.
