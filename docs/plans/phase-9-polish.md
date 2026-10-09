# Phase 9: Polish and launch

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A portfolio-ready public release (spec §9, §12). In this phase:
- every route passes axe (WCAG 2.1 A/AA and best practice), and the keyboard paths axe can't see work: skip link, page titles, focus after navigation, dialogs alongside the story panel, the division board;
- reduced motion and the last interaction polish: pages open at their top, Back restores the position;
- the wall display's ring overload is settled (spec O1);
- every one of the 55 frames is swept again against its design;
- a README that presents the project, screenshots, a social preview image and page meta, then the final production deploy.

**Architecture:**
- **Automated a11y is an e2e gate.** `tests/e2e/a11y.spec.ts` runs axe on every route's sample path and the variants that render differently (view toggles, tabs, an open dialog, the story panel, read-only Jordan, the desktop gate). Zero violations, or the suite fails.
- **Keyboard behaviour lives where it belongs.**
  - The shell owns the skip link, `document.title`, focus after navigation and scroll restoration.
  - `Modal` learns one domain-free idea: a companion region it lets focus into (the story panel).
  - `Table` learns `selectOnFocus` (the division board) and `hiddenHeader` (icon columns).
  - A new `VisuallyHidden` primitive replaces the local `srOnly` classes.
- **One capture config, not part of `pnpm e2e`.** `playwright.capture.config.ts` (`pnpm capture`) serves the app and the design files. It writes:
  - frame/app pairs for the visual QA into `.superpowers/qa/` (git-ignored);
  - the README screenshots into `docs/screenshots/`;
  - the social image into `public/og.png`.

**Tech stack:** as Phase 8, plus one dev dependency: `@axe-core/playwright`. Nothing new ships in the bundle.

**Spec:** `docs/specs/2026-10-08-agent-control-plane-prototype-design.md`:
- §4.1 prototype bar and wall;
- §4.7 viewport policy;
- §5.4 styling: keyboard-only focus rings, reduced motion;
- §8 screen inventory, with the persona and route per frame;
- §9 phases;
- §12 verification (accessibility);
- §13 O1, ring overload.

The design handoff's "Interactions & behaviour" section (row keyboard paths) and "Known open issues" item 1 also apply.

## Global constraints

See `docs/BUILD_PLAN.md` → Global constraints and `CLAUDE.md`. Also:
- **The real company name never appears**: not in the README, meta tags, image text, repo description or topics. Run the forbidden-terms check before every push.
- **`SEED_VERSION` stays 8.** No seed or `DemoState` change in this phase. The story store stays at version 1; its new flag is memory-only.
- **Product screens keep their frames.** A11y fixes don't change the look:
  - a heading level changes, but its class stays;
  - hidden text is `VisuallyHidden`;
  - the only intended visual change is the stale glyph (R10).
  - Every other visible difference is a ledgered departure, flagged at the checkpoint.
- **Copy:** new prototype-layer copy is ours:
  - the skip link: "Skip to content";
  - page titles;
  - README, meta and the repo description.
  - It uses Signal as the brand, says the hospital and people are fictional, and has no gendered pronouns.
- **Tokens only**, including the skip link. The favicon and social image are static assets, so raw colour values are allowed there.
- **No `Date.now()`** in product code.

## Phase-8 facts this plan relies on

- **Shell** (`src/app/AppShell.tsx`):
  - `app` = PrototypeBar + TopNav + `<main>` + `StoryLayer`; `prototype` = the same without TopNav; `kiosk` (`/wall`) = `<Outlet />` alone.
  - Route handles are `{ nav }` (`src/app/nav.ts` `RouteHandle`) built in `src/app/router.tsx` `childrenFor`.
  - Every `RouteDef` in `src/app/routes.ts` has a `title`.
- **Focus rings** show only after Tab or Arrow keys (`src/design-system/focus.ts` sets `data-keyboard` on `<html>`). `tests/e2e/focus.spec.ts` expects the first Tab on `/operations` to land on "Signal · Agent Control Plane"; this phase moves that to the second Tab.
- **Modal** (`src/design-system/primitives/Modal/Modal.tsx`):
  - focuses its first control;
  - cycles Tab inside the dialog;
  - pulls outside focus back on `focusin`;
  - closes on Escape;
  - restores the opener's focus.
- **Story panel** (`src/prototype/StoryPanel/StoryPanel.tsx`):
  - `aside aria-label="Story"`, swapped wholesale between collapsed and expanded on Hide/Show (focus falls to `body` today);
  - keyed by story id in `StoryLayer`, so it remounts when a story starts;
  - `useStoryActions().start(id)` loads step 1 and navigates (`src/prototype/stories/useStory.ts`);
  - Marcus step 6 is `/operations/agents/med-rec?control=pause-agent` (the pause dialog).
- **Story store** (`src/prototype/stories/progress.ts`): `{ progress, exited, setProgress, exit }`, persisted `acp-story` v1, `partialize` keeps `progress` only.
- **Table** (`src/design-system/primitives/Table/Table.tsx`):
  - every row has `tabIndex=0` (design handoff: "Rows are focusable");
  - Arrow Up/Down move focus; Enter/Space call `onOpen ?? onSelect`;
  - click selects; double-click opens.
  - The division board passes both, so the keyboard can open a row but not select it (Phase 3 deferred minor).
- **Division view** (`src/features/board/DivisionView.tsx:27-35`): a document-wide `keydown` sends a bare "e" to `/operations/inbox` unless focus is in a field (Phase 3 deferred: WCAG 2.1.4).
- **Fix one thing** (`src/features/controls/FixOneThing.tsx:69`) uses `Tabs` in button mode as a mode switch. Button-mode tabs say `aria-current="page"` (Phase 4 deferred minor).
- **9a** (`src/features/changes/ChangesTab.tsx:132-140`): each check's done state is an icon only (Phase 6 deferred minor).
- **Icons** (`src/design-system/icons/paths.ts`): `stale` = the review ring with `dash: '2.2 1.75'`. An `Icon` with a `title` is `role="img"`; without one it is `aria-hidden`.
- **No scroll handling on navigation.** There is no `ScrollRestoration`, so a link from low on a long page opens the next page part-way down (Phase 8 deferred minor: "scroll position carries into a dialog step").
- **DesktopGate** (`src/prototype/DesktopGate/DesktopGate.tsx`) subscribes with `addEventListener('change')` only (Phase 8 deferred: Safari < 14).
- **Page shell:**
  - `index.html` has only a `<title>`;
  - there is no `public/` folder, favicon or meta;
  - `README.md` says "Status: in progress".
- **Design frames:**
  - every frame is an element with its id (`#4b`, `#5b`, `#4e`…) in a `designs/*.dc.html` canvas, served by `pnpm designs` on port 4599;
  - the frame tracker maps frame → route, and spec §8 maps frame → persona;
  - scenario ids are `SCENARIO_IDS` in `src/data/scenarios/index.ts`.

## Recon (2026-10-09, `phase-9-polish` at `a2813cb`)

axe-core 4.14 ran on the dev server across all 36 sample paths plus 14 variants, with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `best-practice`.
- **Contrast:** axe evaluates the OKLCH tokens: 0 contrast violations and 0 incomplete.
- **Click targets:** no mouse-only ones. The only `onClick` elements without a Tab stop are RadioCardGroup's roving radios, reachable by arrows.
- **Tab stops** peak at 60 on `/inventory`.
- **Violations: 10 rules.** Task 9.1 fixes all of them:

| Rule | Where | Fix |
|---|---|---|
| `landmark-main-is-top-level`, `landmark-no-duplicate-main`, `landmark-unique` | `/epic`: `EpicPage.tsx:44` renders `<main>` inside the shell's `<main>` | The stand-in's `<main>` becomes a `<div>`; the shell's `main` is the landmark |
| `landmark-one-main`, `region` | `/wall`: the kiosk shell has no landmark | `WallDisplay`'s root element becomes `<main>` |
| `aria-prohibited-attr` | 7c `/operations/incidents/inc-0029`: a `span.box` with `aria-label` and no role | Give it a role that takes a name (`role="img"` if it is a mark), or move the words into `VisuallyHidden` text |
| `empty-table-header` (7 pages) | Tables with an empty column header: 2d Conditions, 3d, 13a, 12b, 3a, 1d, 1i | `Column.hiddenHeader` (R1) at each call site |
| `role-img-alt` | 14a `/inventory/promotions/prm-0007`: `span[aria-label=""]` with `role="img"` | Find the component: an empty label renders `aria-hidden`, or the call site passes a real label |
| `heading-order` | 3a scorecard: `section > h3` straight after the `h1` | `h2` with the same class |
| `label-content-name-mismatch` | 1d tools: `.limitMain` rows 3 and 4 | The accessible name starts with the visible text, or the `aria-label` goes |

**Wall legibility (O1).** At 1× pixel ratio, in greyscale and downscaled to a third (a stand-in for reading from across a room), the stale and review marks are indistinguishable: both read as small grey circles. They still differ by colour and word, but shape alone fails, which is O1's condition (R10).

## Rulings (record each in the BUILD_PLAN decision log when its task lands)

- **R1 The axe gate.**
  - `@axe-core/playwright` (dev only) in `tests/e2e/a11y.spec.ts`.
  - Tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice`; zero violations.
  - No rule is disabled globally. An exclusion names one selector with a reason in a comment and a ledger line.
  - Empty column headers get a visually hidden name: `Column.hiddenHeader?: string`, rendered with `VisuallyHidden`.
- **R2 Rows stay Tab stops; a skip link comes first.**
  - The design handoff makes rows focusable, and the worst page has 60 stops, so rows keep `tabIndex=0`.
  - "Skip to content" is the first Tab stop in the `app` and `prototype` shells:
    - visually hidden until focused, then shown top-left above the prototype bar (z-index 70, `--cs-raised`, `--cs-ink`, radius 4, padding 4/8);
    - activating it moves focus to `<main id="main" tabIndex={-1}>`.
  - Not on `/wall` (one control) or the desktop gate.
- **R3 Page titles.**
  - `document.title` = the route's title + " · Signal Agent Control Plane"; `/` keeps "Signal · Agent Control Plane".
  - Unknown paths read "Page not found · Signal Agent Control Plane".
  - The route handle carries `title`; `pageTitle(title: string | null): string` in `src/app/pageTitle.ts` builds it.
- **R4 Focus after navigation.**
  - After a pathname change (not the first render, not a search-only change), if focus was lost (`document.activeElement` is `body` or not connected), focus the page's first `h1` in `main`, setting `tabIndex=-1` on it.
  - Focus that survived the navigation stays put: tabs, the story panel's Next, a dialog that opened on the new route.
- **R5 Dialogs and the story panel.**
  - `Modal` admits regions marked `data-modal-companion`:
    - focus inside one is not pulled back;
    - Tab from the dialog's last control goes to the first companion's first control, and Tab from the companion's last control goes to the dialog's first;
    - Shift+Tab mirrors both.
  - Escape still closes the dialog. `aria-modal` stays: browsers don't enforce it, and the panel is reachable by Tab.
  - The story panel's `aside` (expanded and collapsed) carries the attribute.
- **R6 The story panel's focus and announcements.**
  - Hide moves focus to Show; Show moves it to Hide.
  - A `VisuallyHidden` `role="status"` in the panel reads "Step 3 of 9: {step title}" and updates on every step change.
  - Starting a story from the landing page or the Stories menu moves focus to the panel's step title (`h2`, `tabIndex=-1`):
    - `start()` sets a memory-only `focusPanel: true` in the story store;
    - the panel focuses the title and clears the flag.
  - Deep links and refreshes don't move focus.
- **R7 The division board follows the keyboard.**
  - `Table` gets `selectOnFocus?: boolean`: focusing a row (Tab or arrows) calls `onSelect(id)` unless it is already selected.
  - The division board turns it on, so the agent panel follows the focused row; Enter still opens the agent.
  - Selection writes `?agent=` with `replace`, so arrowing adds no history.
- **R8 Scroll position.**
  - A new pathname reached by a link opens at the top.
  - A search-only change does not move the page: a tab, a row selection, the story's `?step=` on the same route.
  - Back and Forward restore the position.
  - `<ScrollRestoration getKey={(location) => location.pathname} />` in `AppShell` (all three shells). If the e2e shows it can't meet all three, use a small `useScrollOnNavigate` hook instead and ledger the switch.
- **R9 The "E" shortcut (4b)** fires only while focus is on the page itself (`body` or `main`) or inside the division board's own content (`[data-shortcut-scope="division"]`).
  - It never fires from the prototype bar, top nav, an open menu, a dialog or a field.
  - That makes it "active only on focus" for WCAG 2.1.4. The `E` key hint stays as drawn.
- **R10 Stale becomes a dashed square (spec O1 met, see Recon).**
  - The `stale` icon becomes path `M5 2H10V10H2V2Z`, stroke 1.5, dash `2 2`: an 8×8 square whose four corners all fall in a dash, so it reads as a square.
  - It applies everywhere the icon is used (board chips at 12 px, the wall at 16–18 px, legends, the gallery): one shape, one meaning on the desk and the wall.
  - Dashed still means "no data" only.
  - It departs from every frame that draws stale. The departure is approved by spec O1 and flagged at the checkpoint with the before/after greyscale images.
- **R11 Visual QA is a regression sweep.**
  - Every frame passed its phase checkpoint; since then, later phases changed shared pieces.
  - The capture config writes one side-by-side image per frame: design left, app right, 720 px each, top-aligned.
  - Drift is any difference from the frame that is not a departure in the decision log or this plan. Each drift is fixed or ledgered.
  - The tracker's "QA'd" column keeps ☑, and its intro notes the Phase 9 sweep date.
- **R12 README, images and meta.**
  - The README reuses `PITCH` and the story summaries.
  - Screenshots: `docs/screenshots/*.png` at 1440×900, 1×.
  - `public/og.png` is 1200×630: the Medications division board as Marcus, captured from a 1440×756 viewport at `deviceScaleFactor: 1200 / 1440`.
  - `public/favicon.svg` is the countersign check (the `check` icon path) in white on an ink rounded square.
  - Meta goes in `index.html`; `og:image` and `og:url` use the production URL.
  - No license file: that's Stefan's call, and it's flagged at the checkpoint.
- **R13 Launch.**
  - `main` is production. After Stefan approves, squash-merge and wait for the production deploy.
  - Then run the route and story e2e against production with `BASE_URL`.
  - Then set the repo description, homepage and topics with `gh repo edit` (values in 9.6).
  - GitHub has no API for the social preview image, so Stefan uploads `public/og.png` under Settings → Social preview (flagged).
- **R14 Execution order.** Tasks run 9.1, 9.2, 9.4, 9.3, 9.5, 9.6: the frame sweep and the screenshots come after every visual change.
- **R15 The wall's corner control is the existing "Exit wall display" link** (spec §4.1; Phase 3 built it with 4e). It shows on hover or keyboard focus, and Back also leaves.
  - The wall gets none of the bar's controls: persona and stories don't change what a wall shows.
  - The link moves inside the wall's new `<main>`.
  - This closes Phase 8's handoff note.

## Review Focus

Failure modes most likely to bite a visitor that no screen-level test covers. Each has its test in the owning task.

1. **Focus lost after a link unmounts itself** (open an agent from the division board with Enter):
   - the next Tab must start in the new page, not at the top of the prototype bar;
   - a dialog that opens on the new route keeps focus.
   - *(9.1 keyboard e2e.)*
2. **A keyboard user in a story step that opens a dialog** (Marcus step 6):
   - Tab reaches the panel's Next without closing the dialog;
   - Next advances the story;
   - Escape still closes only the dialog.
   - *(9.1 Modal unit test and keyboard e2e.)*
3. **Navigating from low on a long page**:
   - the next page opens at its top;
   - a tab switch or row selection on the same page doesn't jump;
   - Back returns to where the visitor was.
   - *(9.2 e2e.)*
4. **Typing "e" anywhere but the board** (the persona menu, a dialog, a field) must not throw the visitor into the inbox. *(9.1 keyboard e2e.)*
5. **A shared link's preview** (Slack, LinkedIn, iMessage) shows the title, description and image. `og:image` is absolute and serves a 1200×630 PNG on the deployment. *(9.5 unit test on `index.html` and `public/og.png`; 9.6 fetches it from the preview URL.)*

Also pinned:
- reduced motion: no smooth scroll and no transitions *(9.2)*;
- every relative link and image in the README resolves *(9.5)*.

---

## Task 9.0: Plan

- [x] Write this file from the BUILD_PLAN task list, the spec, Phase 8's handoff notes, every phase's deferred a11y minors and the recon above; commit `docs: Phase 9 plan`.

## Task 9.1: Keyboard and accessibility pass

**Files:**
- Modify: `package.json` (dev dependency `@axe-core/playwright`).
- Create:
  - `tests/e2e/a11y.spec.ts`, `tests/e2e/keyboard.spec.ts`;
  - `src/app/pageTitle.ts` and its test, `src/app/usePageChrome.ts` (title and focus after navigation);
  - `src/layout/SkipLink/SkipLink.tsx` and its `.module.css`;
  - `src/design-system/primitives/VisuallyHidden/VisuallyHidden.tsx` and its `.module.css` (exported from the barrel).
- Modify, for the shell:
  - `src/app/nav.ts` (`RouteHandle.title`), `src/app/router.tsx` (handle title, including `NotFound`);
  - `src/app/AppShell.tsx` (skip link, `main id="main" tabIndex={-1}`, `usePageChrome`).
- Modify, for primitives:
  - `Modal.tsx` and its test (R5);
  - `Table.tsx` and its test (`selectOnFocus`, `hiddenHeader`);
  - `Tabs.tsx` and its test (button mode: `aria-pressed`, not `aria-current`).
- Modify, for the story layer:
  - `src/prototype/stories/progress.ts` and its test (`focusPanel`), `useStory.ts` (`start` sets it);
  - `StoryPanel.tsx` and its test (R6, companion attribute).
- Modify, for features:
  - `DivisionView.tsx` (R7, R9), `EpicPage.tsx`, `WallDisplay.tsx`, `ChangesTab.tsx`;
  - the call sites in the Recon table;
  - the Button, TrendChart and changes `srOnly` classes move to `VisuallyHidden` where the element is a plain span.
- Modify: `tests/e2e/focus.spec.ts` (the bar's link is now the second Tab stop).

**Interfaces:**
- Produces:
  - `pageTitle(title: string | null): string`;
  - `usePageChrome(): void`, called in `AppShell` for all shells;
  - `SkipLink()`;
  - `VisuallyHidden({ children, id? })`;
  - `RouteHandle { nav: NavSection | null; title: string | null }` (`null` on the `*` route);
  - `Column<Row>.hiddenHeader?: string`, `TableProps.selectOnFocus?: boolean`;
  - `StoryStore.focusPanel: boolean`, `StoryStore.requestPanelFocus(): void`, `StoryStore.panelFocused(): void`.
- Consumes: `routeTable` (`src/app/routes.ts`), `stepHref`, `STORIES`.

- [x] **Step 1: Install** `pnpm add -D @axe-core/playwright`.
- [x] **Step 2: Write the failing axe spec** (`a11y.spec.ts`). For each case, go to the URL, wait for the `h1` (the gate's case waits for its own `h1`), then run `new AxeBuilder({ page }).withTags([...R1 tags]).analyze()`. Expect `violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)` to equal `[]`. The cases:
  - every `routeTable` sample path;
  - variants:
    - `/operations?view=tiles`, `/operations?view=exceptions`, `/operations/inbox?view=digest`;
    - `/operations/agents/med-rec?tab=scorecard`, `/operations/agents/med-rec?tab=changes`, `/operations/agents/med-rec?control=pause-agent`;
    - `/operations/agents/med-rec?scenario=change-detected-v150&tab=changes`;
    - `/inventory/agents/med-rec/onboarding/` + each of `intake`, `systems`, `tools`, `approval`, `review`;
    - `/inventory?tab=drafts`, `/epic?day=later`;
    - `/operations/divisions/medications?story=marcus&step=2`;
  - the agent view with its control menu open;
  - as Jordan (via the persona menu, as `persona.spec.ts` does): `/settings/divisions/medications`, `/settings/people`, `/inventory/privileges/prv-0142/sign`, `/operations/agents/med-rec`, `/operations/incidents/inc-0029`;
  - the desktop gate at 800×900.
- [x] **Step 3: Run** `pnpm e2e tests/e2e/a11y.spec.ts`. Expected: FAIL with the rules in the Recon table (and only those).
- [x] **Step 4: Fix each violation** as the Recon table says. Add `VisuallyHidden` and `Column.hiddenHeader` first: the header renders `<span role="columnheader"><VisuallyHidden>{hiddenHeader}</VisuallyHidden></span>` when `header` is empty. Name each column for what it holds ("Status", "Done", "Open").
- [x] **Step 5: Run** the axe spec, then `pnpm check`. Expected: PASS. Commit `fix: every route passes axe`; log R1.
- [x] **Step 6: Write the failing unit tests:**
  - `pageTitle.test.ts`:
    - `pageTitle('Division view')` → `'Division view · Signal Agent Control Plane'`;
    - `pageTitle('Signal · Agent Control Plane')` → `'Signal · Agent Control Plane'`;
    - `pageTitle(null)` → `'Page not found · Signal Agent Control Plane'`.
  - `Modal.test.tsx`, with `<div data-modal-companion><button>Next</button></div>` rendered beside an open dialog whose controls are "Cancel" and "Pause agent":
    - Tab from "Pause agent" focuses "Next";
    - Tab from "Next" focuses "Cancel";
    - Shift+Tab from "Cancel" focuses "Next";
    - `next.focus()` stays on "Next";
    - focusing a button outside both is pulled back to "Cancel";
    - Escape with focus on "Next" calls `onClose`.
  - `Table.test.tsx`:
    - with `selectOnFocus`, focusing an unselected row calls `onSelect` with its id, and focusing the selected row doesn't;
    - without it, focus never calls `onSelect`;
    - a column with `header: ''` and `hiddenHeader: 'Status'` gives a `columnheader` named "Status".
  - `Tabs.test.tsx`: button-mode tabs expose `aria-pressed` (true on the current one) and no `aria-current`; link-mode tabs keep `aria-current="page"`.
  - `progress.test.ts`:
    - `requestPanelFocus()` sets `focusPanel`, and `panelFocused()` clears it;
    - `focusPanel` is not in the persisted value.
  - `StoryPanel.test.tsx`:
    - Hide → the "Show" button has focus; Show → "Hide" has focus;
    - a `status` reads "Step 1 of 3: {title}", then "Step 2 of 3: {title}" after Next;
    - with `focusPanel: true` set before render, the step title (`h2`) has focus and `focusPanel` is false;
    - the panel's `aside` has `data-modal-companion`.
  - `ChangesTab` test (create if none): each check's accessible text says whether it is done ("Done" / "Not yet"), using the copy already beside it where there is some.
- [x] **Step 7: Run** `pnpm test`. Expected: FAIL on exactly these tests.
- [x] **Step 8: Implement** them:
  - `pageTitle`;
  - Modal R5: companions are `document.querySelectorAll('[data-modal-companion]')` read at key time, so a panel that mounts later counts;
  - Table `selectOnFocus` (`onFocus` on the row, ignoring focus that lands in a cell's control), and Tabs `aria-pressed`;
  - the story store flag; `start()` calls `requestPanelFocus()`;
  - StoryPanel R6: Hide/Show focus through refs and an effect keyed on `hidden`; the status line; the title focus effect; the companion attribute;
  - ChangesTab text.
- [x] **Step 9: Run** `pnpm test`. Expected: PASS.
- [x] **Step 10: Write the failing keyboard e2e** (`keyboard.spec.ts`):
  - **Skip link.** On `/operations`:
    - the first Tab focuses a visible link "Skip to content", and Enter focuses `main`;
    - the next Tab lands inside `main`, not in the prototype bar.
    - `/wall` has no skip link.
  - **Titles.**
    - `/operations/divisions/medications` → "Division view · Signal Agent Control Plane";
    - `/` → "Signal · Agent Control Plane";
    - `/no-such-page` → "Page not found · Signal Agent Control Plane".
  - **Focus after navigation.** On `/operations/divisions/medications`:
    - Tab into the board: the first row is focused and selected, and the side panel names that agent;
    - ArrowDown: the second row is focused, selected, and the URL has its `?agent=`;
    - Enter: the agent view opens, its `h1` is focused, and the next Tab lands inside `main`.
  - **Dialog on a new route keeps focus.**
    - On the agent view, open the control menu with the keyboard and choose "Pause agent": focus is inside the dialog.
    - Escape: the dialog closes and focus returns to the menu trigger.
  - **Story + dialog (Review focus 2).** Go to `stepHref(marcus, 6)` ("Pause agent" dialog open):
    - Tab from the dialog's last control → the panel's "Hide";
    - more Tabs reach "Next"; Enter → the panel reads "Step 7 of 9";
    - on `stepHref(marcus, 6)` again, Escape with focus in the dialog closes it, and the panel is still there.
  - **Starting a story by keyboard.** On `/`, Tab to "Follow Marcus’s story →" and press Enter: the panel's step title is focused and its `status` reads "Step 1 of 9: …".
  - **Landing order.** On `/`, the seven "Follow … story →" buttons are reached by Tab in persona order, after "Explore freely".
  - **E shortcut (Review focus 4).** On the division view:
    - focus the persona menu trigger and press "e": the URL is unchanged;
    - open the persona menu and press "e": unchanged;
    - focus a board row and press "e": the URL is `/operations/inbox`.
- [x] **Step 11: Run** `pnpm e2e tests/e2e/keyboard.spec.ts`. Expected: FAIL (no skip link, static title, focus on `body`, rows not selected, "e" fires from the bar).
- [x] **Step 12: Implement:**
  - `SkipLink`;
  - `main` id and tabIndex;
  - `usePageChrome` (R3 title from the deepest match's handle, else `null`; R4 focus);
  - the router's handle titles;
  - `DivisionView` R9 (scope attribute on the board's layout element; the listener checks `document.activeElement` against R9) and R7 (`selectOnFocus` on the board table).
  - In `focus.spec.ts`, the bar's link is reached with two Tabs.
- [x] **Step 13: Run** `pnpm e2e`. Expected: PASS (all specs, including stories and focus).
- [x] **Step 14: Run** `pnpm check`. Expected: PASS. Commit `feat: keyboard paths, page titles and focus after navigation`; log R2–R7 and R9.

## Task 9.2: Reduced motion and interaction polish

**Files:**
- Modify: `src/app/AppShell.tsx` (R8), `src/prototype/DesktopGate/DesktopGate.tsx` and its test, `src/prototype/stories/engine.ts` (comment on `openStep`'s `loaded` for a kept step).
- Create: `tests/e2e/motion.spec.ts`.

- [x] **Step 1: Write the failing scroll e2e** (`motion.spec.ts`, Review focus 3):
  - **New page opens at the top.** On `/inventory`, scroll to the bottom, then click the last agent's link to its record: `scrollY` is 0 on `/inventory/agents/…`.
  - **Same-page changes don't jump.** On `/operations/divisions/medications`:
    - scroll 300 px and click a lower row: `scrollY` is unchanged, and the URL has `?agent=`;
    - on `/operations/agents/med-rec`, scroll 200 px and switch to the Scorecard tab: `scrollY` is unchanged.
  - **Back restores.** On `/inventory`, scroll to 600 and open an agent; Back: `scrollY` is 600 ± 2.
  - **Story steps.** From Marcus step 5 (a scrolled inbox detail), Next: step 6 opens with the dialog and `scrollY` 0.
- [x] **Step 2: Write the reduced-motion pins** (same file, `test.use({ reducedMotion: 'reduce' })`). Both pass on their first run; they pin the current behaviour (ledger that):
  - a board row's computed `transition-duration` is `0s`;
  - starting a story step whose target is below the fold lands at its final `scrollY` within two animation frames.
- [x] **Step 3: Run** `pnpm e2e tests/e2e/motion.spec.ts`. Expected: the scroll tests FAIL (pages open part-way down); the pins PASS.
- [x] **Step 4: Implement** R8 in `AppShell` (`ScrollRestoration` keyed by pathname, inside the router, in all three shells).
- [x] **Step 5: Run** it. Expected: PASS. If `ScrollRestoration` can't meet the same-page cases, replace it with the hook (R8) and ledger.
- [x] **Step 6: Write the failing gate test:** with a `matchMedia` stub that has `addListener`/`removeListener` but no `addEventListener`, a `change` flips the gate.
- [x] **Step 7: Run** `pnpm vitest run src/prototype/DesktopGate`. Expected: FAIL (throws, or doesn't flip).
- [x] **Step 8: Implement** the fallback. Add the one-line comment on `openStep`: a kept step records the scenario as loaded because the visitor's own state stands in for it.
- [x] **Step 9: Run** `pnpm check` and `pnpm e2e`. Expected: PASS. Commit `feat: pages open at the top, Back restores; gate fallback`; log R8.

## Task 9.4: Wall legibility: stale becomes a dashed square

**Files:**
- Modify: `src/design-system/icons/paths.ts`, `src/design-system/icons/Icon.test.tsx`.
- Modify, as found: any copy that says "dashed ring" (`grep -rni "dashed ring" src docs/design-handoff.md`). The design handoff gets a dated note under "Known open issues" item 1, not a rewrite.

- [x] **Step 1: Write the failing test:** `ICONS.stale.shapes` equals `[{ kind: 'path', d: 'M5 2H10V10H2V2Z', strokeWidth: 1.5, dash: '2 2' }]`; `ICONS.ring` is unchanged.
- [x] **Step 2: Run** `pnpm vitest run src/design-system/icons`. Expected: FAIL.
- [x] **Step 3: Implement** R10.
- [x] **Step 4: Run** `pnpm check`. Expected: PASS. Fix any test that pinned the old ring geometry; say so in the commit.
- [x] **Step 5: Check by eye.**
  - Screenshot `/wall` and `/operations/divisions/medications` at 1×.
  - Repeat the recon's greyscale, ⅓-scale check on the wall's three marks.
  - Zoom into a board chip at 12 px.
  - Stale must read as square and review as round in greyscale.
  - Keep the before and after images in `.superpowers/qa/o1/` for the checkpoint.
- [x] **Step 6: Commit** `feat: stale reads as a dashed square (O1)`; log R10.

## Task 9.3: Visual QA of every frame

**Files:**
- Create:
  - `playwright.capture.config.ts`: `testDir: 'tests/capture'`; two `webServer`s, the app (as `playwright.config.ts`) and `pnpm designs` on 4599; viewport 1440×900;
  - `tests/capture/frames.ts`;
  - `tests/capture/qa.spec.ts`, which only writes files when `QA=1`.
- Modify: `package.json` (`"capture": "playwright test -c playwright.capture.config.ts"`), `tsconfig.e2e.json` (include the new config).

**Interfaces:**
- Produces: `interface FrameShot { frame: string; file: string; url: string; persona?: PersonaId; act?: (page: Page) => Promise<void> }` and `FRAMES: FrameShot[]`, one per frame tracker row (`4a·wall/4e` captures `4e`). For each frame:
  - `url` is its route with `?scenario=` for its state (spec §8 and §6.3; the frame's phase e2e shows how each state is reached);
  - `persona` comes from spec §8;
  - `act` opens what the frame shows open (menus, dialogs, typed reasons).
- 9.5 reuses the config and the persona helper.

- [x] **Step 1: Write the capture.** For each `FRAMES` entry:
  - **App side:** set the persona with the persona menu, go to `url`, run `act`, then take a full-page screenshot.
  - **Design side:** open `http://localhost:4599/<file>`, wait for fonts, then screenshot the 1440-wide artboard inside `#<frame>`. Inspect one file first to find the artboard element.
  - **Pair:** compose design (left) and app (right), each scaled to 720 px wide, in a `page.setContent` page.
  - **Output:** write `.superpowers/qa/<frame>.png`.
- [x] **Step 2: Run** `QA=1 pnpm capture tests/capture/qa.spec.ts`. Expected: 55 pairs, no errors. A frame whose state can't be reached is a finding: fix the table or ledger it.
- [x] **Step 3: Review every pair** for layout, copy, values, colour, type, spacing and icons. List each difference in the ledger as `QA <frame>: <difference> — drift | departure (<decision-log ref or R10>)`.
- [x] **Step 4: Fix each drift** in the owning feature or component. A drift caused by logic (a wrong count, date or state) gets a failing unit test first. Re-capture the affected frames and look again.
- [x] **Step 5: Run** `pnpm check` and `pnpm e2e`. Expected: PASS. Commit:
  - `test: frame capture for visual QA` (config, table, spec);
  - `fix: visual drift from the frames` (if any; the body lists the frames);
  - note the sweep date in the frame tracker's intro.

## Task 9.5: README, screenshots, social image, page meta

**Files:**
- Create:
  - `tests/capture/readme.spec.ts`, which writes the screenshots and `public/og.png`;
  - `public/favicon.svg`;
  - `docs/screenshots/*.png`;
  - `src/app/meta.test.ts`, which reads `index.html`, `public/og.png` and `README.md` from disk.
- Modify: `index.html`, `README.md`.

- [x] **Step 1: Write the failing meta test** (`meta.test.ts`):
  - **`index.html`:**
    - `<title>` "Signal · Agent Control Plane";
    - `meta[name=description]` and `og:description` equal `PITCH`;
    - `og:title` "Signal · Agent Control Plane";
    - `og:type` "website";
    - `og:url` "https://agent-control-plane-mocha.vercel.app/";
    - `og:image` "https://agent-control-plane-mocha.vercel.app/og.png", with `og:image:width` 1200 and `og:image:height` 630;
    - `twitter:card` "summary_large_image";
    - `link[rel=icon][type="image/svg+xml"]` "/favicon.svg";
    - `meta[name=theme-color]`.
  - **`public/og.png`:** a PNG whose IHDR width and height (bytes 16–23) are 1200 × 630.
  - **`README.md`:**
    - every relative link and image target exists on disk;
    - it contains `PITCH` and the live URL;
    - it has no gendered pronouns (the stories test's regex);
    - "Status: in progress" is gone.
- [x] **Step 2: Run** `pnpm vitest run src/app/meta.test.ts`. Expected: FAIL.
- [x] **Step 3: Capture** (`readme.spec.ts`, run with `pnpm capture tests/capture/readme.spec.ts`), at 1440×900, 1×, with no story panel unless named:

  | File | Screen |
  |---|---|
  | `docs/screenshots/landing.png` | `/` |
  | `docs/screenshots/division-board.png` | `/operations/divisions/medications` as Marcus (4b) |
  | `docs/screenshots/agent-view.png` | `/operations/agents/med-rec` (4c) |
  | `docs/screenshots/inbox.png` | `/operations/inbox/exc-5530` (5a) |
  | `docs/screenshots/sign-privilege.png` | `/inventory/privileges/prv-0142/sign?scenario=awaiting-signature` as Priya (3c) |
  | `docs/screenshots/story.png` | `stepHref(marcus, 3)`, panel showing |
  | `docs/screenshots/wall.png` | `/wall` |
  | `public/og.png` | R12 |

- [x] **Step 4: Write** `public/favicon.svg` (R12) and the meta in `index.html`.
- [x] **Step 5: Write the README:**
  1. The title.
  2. One paragraph: the current one, tightened, plus `PITCH`.
  3. **Try it:**
     - the live URL;
     - three ways in: follow a story, explore freely, About.
  4. The division-board screenshot.
  5. **The people:** a table with name, role, story title and summary from `STORIES`.
  6. **What's in it:**
     - 55 frames across E1–E15;
     - seven guided stories;
     - persona switcher with real permissions;
     - a mock hospital that remembers what you do;
     - the wall display;
     - the Countersign component sheet.
     - A two-by-two grid of screenshots.
  7. **How it's built:**
     - the stack;
     - the three layers;
     - store, scenarios, `can()` and the audit log;
     - the story engine;
     - tests: unit and e2e counts from the final run; the axe gate; the frame capture.
  8. **Run it locally:** `pnpm install`, `pnpm dev`, `pnpm check`, `pnpm e2e`, `pnpm designs`, `pnpm capture`.
  9. **Docs:** the existing list.
  10. **About the names:** Signal, Lakeshore Health and every person are fictional; the data is mock; the Epic screens are neutral stand-ins.
  11. "By [StefanNav](https://github.com/StefanNav)".
- [x] **Step 6: Run** `pnpm check`. Expected: PASS. Check the README renders on GitHub's preview (`gh api` markdown render, or after push). Commit `docs: portfolio README, screenshots, social image and page meta`; log R12.

## Task 9.6: E2E, fresh review, checkpoint, launch

**Files:**
- Modify: `playwright.config.ts`: `baseURL: process.env.BASE_URL ?? 'http://localhost:4173'`, and no `webServer` when `BASE_URL` is set.
- Modify: `docs/BUILD_PLAN.md`.

- [x] **Step 1: Run** `pnpm check` and `pnpm e2e`. Expected: PASS. Fix what fails, test-first where it's logic.
- [x] **Step 2: Fresh review.** Dispatch a reviewer on the whole branch (superpowers:requesting-code-review) with this plan's Review Focus and the ledger's rulings. Fix Critical and Important findings test-first, re-grade minors by what a visitor gets, and list the rest as deferred.
- [x] **Step 3: Update `docs/BUILD_PLAN.md`:**
  - tick 9.0–9.5;
  - handoff notes: what exists, review fixes, deferred minors, gotchas, and "what's left" (the deferred list across phases);
  - decision log rows R1–R14 as landed;
  - Start here: ⏸ at checkpoint, PR link, preview URL;
  - a session log row.
- [x] **Step 4: Checkpoint.**
  - `pnpm check` and `pnpm e2e` green; the forbidden-terms check prints nothing (including the README and image alt text).
  - Push `phase-9-polish` and open the PR "Phase 9: Polish and launch". Body: task checklist, preview URL, screenshots, the O1 before/after, the QA drift list, `Closes #10`.
  - Tick the issue's checklist.
  - On the preview URL:
    - `curl -sI <preview>/og.png` returns 200 `image/png`;
    - `curl -s <preview>/` shows the meta tags;
    - if the preview isn't behind Vercel's login, run `BASE_URL=<preview> pnpm e2e tests/e2e/routes.spec.ts`. If it is, say so.
- [x] **Step 5: STOP.** Ask Stefan to review the preview URL. Merge only after approval. Name the open questions: a license, the "By" line, and the social preview upload.
- [x] **Step 6: Launch (after approval).**
  - Squash-merge and wait for the production deploy.
  - Run `BASE_URL=https://agent-control-plane-mocha.vercel.app pnpm e2e tests/e2e/routes.spec.ts tests/e2e/stories.spec.ts`. Expected: PASS.
  - Run `gh repo edit StefanNav/agent-control-plane` with:
    - `--homepage https://agent-control-plane-mocha.vercel.app`;
    - `--description "Clickable prototype of Agent Control Plane: an operations console for supervising AI agents in a hospital. Built from the Countersign design system, on mock data."`;
    - `--add-topic` for each of `prototype`, `react`, `typescript`, `vite`, `zustand`, `playwright`, `design-system`, `accessibility`, `healthcare`, `ai-governance`.
  - Close out: Phase 9 ☑ Merged; Start here reads "All phases merged"; session log row. Run the forbidden-terms check, then push `main`.
