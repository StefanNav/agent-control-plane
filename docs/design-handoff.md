# Handoff: Agent Control Plane · Countersign design system + epics E1–E15

> Moved from the repo root. Paths below (designs/, reference/) are relative to the repo root.

## Overview
Agent Control Plane is the operations side of an AI management system (AIMS) for hospitals. It lets named humans onboard AI agents, grant them staged privileges (Shadow → Draft → Supervised → Autonomous), supervise them live, stop them, and produce audit evidence. Sample hospital: **Lakeshore Health**. Main thread: **Med Rec Agent** in the **Medications** division.

This bundle contains:
- **Countersign**, the final design system (tokens, 10 product components, light + dark).
- **15 epics (E1–E15)** drawn as high-fidelity 1440 px screens, one frame per moment in each flow.

Not included: v3 epics E16–E21 (directional only, not designed yet).

## About the design files
The files in `designs/` are **design references built in HTML**. They show the intended look and behaviour; they are not production code. Recreate them in the target codebase's environment (React, Vue, etc.) using its own patterns and libraries. If there's no environment yet, pick the framework that suits the project. Don't ship the HTML.

To view them: open any `designs/*.dc.html` in a browser, served from that folder (`npx serve designs`). Each file loads `support.js` (a small runtime) and Google Fonts. Every frame is drawn with inline styles, so exact values can be read straight from the markup with browser devtools.

`reference/cs-build.js` is the helper library that generated the E2–E15 markup. It's the most compact, exact statement of tokens and primitive specs (buttons, fields, tables, modals, etc.), so read it before implementing.

## Fidelity
**High fidelity.** Final colours, type, spacing, states and copy. Recreate it pixel-perfectly. People, rule IDs, case counts and dates are sample data.

## Personas (used across all flows)
- **Dana**: AI program lead. All divisions.
- **Priya**: clinical sponsor (Director of Pharmacy). Signs privileges.
- **Marcus**: agent owner (pharmacy informatics). Medications.
- **Sam**: technical owner (integration analyst).
- **Dr. Lee**: chair of the AI review board. Approves.
- **Ana**: frontline pharmacist. Works **inside Epic** (EHR), never in the console.
- **Jordan**: risk manager. Read-only.

## Domain glossary
- **Activity**: one job an agent does, e.g. "Reconcile home medications at admission".
- **Privilege** (`PRV-0142 v3`): a signed grant for one activity at one autonomy level, in one domain (units, population), with conditions, evidence and a review date.
- **Autonomy levels**: Shadow (runs, output not used), Draft (a person signs every output), Supervised (acts; a person samples), Autonomous (administrative only). In v1, levels above Draft are locked.
- **Hard stop** (`HS-04 v2`): a rule enforced at the gateway, outside the model. The agent can't edit or argue past it.
- **Instruction**: advisory text in the agent's prompt. Never safety-critical.
- **Exception**: anything that needs a person. Each has an action, an owner and a deadline.
- **Review level**: Tightened, Normal or Reduced. Sets how much signed output a second pharmacist checks.
- **Monitor stale**: monitoring data hasn't arrived within its expected interval. Must never look like "healthy".

---

## Design tokens

Colours are authored in **OKLCH** with a warm neutral hue (h90). Hex values are sRGB conversions. Use OKLCH where the platform supports it.

### Light (default)
| Token | OKLCH | Hex | Use |
|---|---|---|---|
| page | 1 0 0 | #FFFFFF | component sheet surface |
| screen bg (`C.page` in cs-build) | 0.985 0.002 90 | #FAFAF9 | app body behind cards; table header rows (`sunk`) |
| raised | 1 0 0 | #FFFFFF | cards, nav, page header |
| hover | 0.975 0.003 90 | #F7F7F4 | row hover |
| neutral fill (`C.sel` in cs-build) | 0.965 0.003 90 | #F4F3F1 | locked fields, current ladder cell, hard-stop body, avatar, blocked button |
| sel (selection tint) | 0.96 0.02 268 | #ECF2FF | selected row / radio / segment / step (`C.tint` in cs-build) |
| selBar / acc | 0.43 0.15 268 | #2D46A1 | **indigo**: primary button, selection bar, nav/tab current underline, checked checkbox |
| line | 0.925 0.004 90 | #E7E6E3 | hairlines, card borders, row dividers |
| lineStrong | 0.87 0.005 90 | #D5D4D0 | field borders, secondary buttons, paper, tags, modal |
| off | 0.72 0.006 90 | #A6A4A0 | disabled text, "not granted" box |
| icon | 0.6 0.006 90 | #81807C | icons, unchecked radio/checkbox |
| meta | 0.5 0.006 90 | #64635F | labels, secondary info |
| text2 | 0.41 0.006 90 | #4C4A47 | body secondary, inactive nav/tabs |
| strong | 0.31 0.005 90 | #31302D | numbers in tables, stale chip text |
| ink | 0.21 0.004 90 | #191816 | primary text, focus outline, hard-stop header |
| rev | 0.5 0.085 200 | #007176 | **teal**: review waiting, nothing else |
| warn (mark) | 0.65 0.14 70 | #C47D04 | warning icon and border |
| warnT (text) | 0.5 0.1 62 | #8B551C | warning text |
| crit | 0.52 0.19 27 | #BE2323 | critical icon, border, text; overdue deadlines |
| ladPass | 0.72 0.006 90 | #A6A4A0 | passed ladder segment |
| ladLock | 0.925 0.004 90 | #E7E6E3 | locked ladder segment |
| canvas | 0.93 0.003 90 | #E8E8E6 | presentation canvas only (not product UI) |
| scrim | 0.21 0.004 90 / 0.32 | #191816 @ 32% | modal backdrop |

### Dark (wall display, `mode="dark"` in CountersignCore)
| Token | OKLCH | Hex |
|---|---|---|
| page | 0.165 0.004 90 | #0F0E0C |
| raised | 0.2 0.005 90 | #171613 |
| sunk | 0.185 0.004 90 | #131311 |
| hover | 0.23 0.005 90 | #1E1D1A |
| sel | 0.29 0.045 268 | #222A42 |
| selBar / acc (marks + text) | 0.74 0.12 268 | #8AA8F7 |
| focus | 0.96 0.002 90 | #F2F2F0 |
| line | 0.29 0.005 90 | #2C2B29 |
| lineStrong | 0.38 0.006 90 | #43423F |
| off | 0.46 0.006 90 | #595854 |
| icon | 0.6 0.006 90 | #81807C |
| meta | 0.72 0.005 90 | #A6A4A1 |
| text2 | 0.8 0.004 90 | #BFBEBB |
| strong | 0.88 0.003 90 | #D8D7D5 |
| ink | 0.96 0.002 90 | #F2F2F0 |
| rev | 0.78 0.09 200 | #6AC9CE |
| warn | 0.8 0.14 78 | #EFB146 |
| warnT | 0.83 0.12 80 | #F0BE67 |
| crit | 0.7 0.17 27 | #F66D62 |
| ladPass | 0.52 0.006 90 | #6A6965 |
| ladLock | 0.3 0.005 90 | #2F2E2B |

Dark rule: accents lighten for **marks and text** to stay above 4.5:1 on the panel. **Button fills keep the deeper light-mode indigo** (#2D46A1) with white text.

### Colour semantics (enforce in code review)
- **Indigo (h268)**: the primary action, plus "current/selected" (selected row tint and 2px bar, current nav item and tab underline, selected radio and segment, active wizard step).
- **Teal (h200)**: only "review waiting". Review chips and "Awaiting signature".
- **Amber / red**: warning / critical status only.
- Everything healthy stays **grey**. Colour appears only where a human must act. Every status pairs **colour + shape + word**, so it reads in greyscale.
- No gradients, no emoji, no coloured left-border cards.

### Typography
- **IBM Plex Sans** 400 / 600 (only these two weights). **IBM Plex Mono** 400 / 600 for IDs, versions, timestamps, rule tags and labels.
- `font-variant-numeric: tabular-nums` globally. `-webkit-font-smoothing: antialiased`.

| Role | Size / line | Weight |
|---|---|---|
| Page title | 24 / 32 | 600 (sheet headers add −0.01em tracking) |
| Stat value | 20 / 28 | 600 |
| Section / modal title, hard-stop title | 18 / 24 | 600 |
| Form body, field text, card title, ladder level | 16 / 24 | 400 / 600 |
| UI text, buttons, tabs, nav, notes | 14 / 20 | 400; buttons 600 |
| Dense tables and boards, chips (compact) | 13 / 18 | 400; attention chips 600 |
| Meta, sub-lines | 12 / 16 | 400 |
| Mono value (IDs, times) | Mono 12 / 16 | 400 |
| Label (column headers, group labels) | Mono 12 / 16, UPPERCASE, +0.05em | 600, meta colour |
| Nav wordmark "AIMS" | 14, +0.04em | 600 |

Density: **monitoring screens run at 13 px** (boards, tables). **Forms and signing run at 16 px** with 44 px fields.

### Spacing, radius, borders, elevation
- Spacing (px): 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56. Grid gaps are usually 12 / 16 / 20 / 24 / 40.
- Radius: **1** ladder segments · **2** chips, rule tags, hard-stop card · **3** buttons, fields, pills, radios, menus, inbox segmented control · **4** instruction text well · **6** cards, paper, modals · **8** outer screen frame · 50% avatar.
- Borders: 1 px `line` for cards and dividers. 1 px `lineStrong` for fields, secondary buttons, paper, tags and menus. **1.5 px** for selected radio and segment (`acc`), hard stop (`ink`), checkbox and radio outlines. **Dashed means "no data"**: use it only for stale.
- Focus: `outline: 2px solid ink; outline-offset: 1px` on fields. Table rows use `-2px` offset. **Keyboard only** (show after Tab or Arrow, hide on mousedown).
- Elevation: menu `0 8px 24px oklch(0.21 0.004 90 / 0.14)`. Modal `0 16px 48px oklch(0.21 0.004 90 / 0.2)` on the 32% scrim. Nothing else has shadows.
- Motion: row background `150ms ease-out`. Disable it under `prefers-reduced-motion`.

---

## Shared primitives (exact specs in `reference/cs-build.js`)
- **App frame**: 1440 wide. Background #FAFAF9.
- **Top nav**: 48 high, padding 0 24, white, bottom border `line`. Contents: "AIMS" wordmark, then the nav (gap 24): Portfolio · Inventory · Operations · Reports · Settings. The current item is 600 with `inset 0 -2px 0 acc`. On the right: "Lakeshore Health" and a 28 px avatar (initial, `#F4F3F1` fill).
- **Page header**: white, padding 24 40 24 (0 bottom when tabs or steps follow), bottom border `line`. Contents: breadcrumb (12 meta), title (24/600), then inline status (14 meta), a mono ID line, chips, and a people line ("Owner **Marcus**" pairs, 14, gap 20). Actions sit right-aligned, gap 12.
  - **Tabs**: 40 high, gap 24, 14 px. The current tab is 600 with a 2 px indigo underline.
  - **Wizard steps**: equal grid of cells, padding 12 16 14. Each cell has a status mark and label (14/20) and a sub-line (12 meta). The active step gets the `sel` tint and a 2 px indigo underline. Step marks: done = check, todo = 14 px box, locked = lock, review = teal ring.
- **Body layouts**:
  - `split`: main `1fr` + 340 sidebar, gap 40, padding 32 40 48.
  - `splitL`: 420 list + `1fr` detail, gap 24, padding 24 40 48.
  - `body`: column, gap 20, padding 28 40 48.
- **Card**: white, 1 px `line`, r6, overflow hidden. **Paper** (form sheet): white, 1 px `lineStrong`, r6, padding 28 32 32, gap 28.
- **Buttons**, all r3, 14/600, gap 8, padding 0 14:
  - primary: 36 high, `acc` fill, white text.
  - secondary: 36 high, white with 1 px `lineStrong`, ink text.
  - ghost: 32 high, padding 0 8, `text2`.
  - blocked: 36 high, `#F4F3F1` fill, 1 px `line`, meta text, `not-allowed` cursor.
  - In-card buttons use 32 high / 13 px.
- **Field**: label (14/600), optional right-hand hint (14 meta), help text (14 meta), then the control. **Input**: min 44 high, padding 10 14, 1 px `lineStrong`, r3, 16/24. Locked input: `#F4F3F1` fill, `line` border, lock icon. Select: chevron at the right. **Textarea**: min 108.
- **Radio card**: padding 10 12, r3, 18 px circle. Selected: 1.5 px `acc` border, `sel` tint, 8 px `acc` dot, 600 title. Disabled: `off` text.
- **Checkbox**: 18 px, r3. Unchecked: 1.5 px `icon` border. Checked: `acc` fill with a white check.
- **Segmented choice**: equal grid, gap 8, padding 10 14. Selected uses the same treatment as the radio card.
- **Filter pill**: 32 high, r3. On: 1 px ink border, 600. Off: `lineStrong` border, `text2`.
- **Table**: a card.
  - Header row: 32 high (28 in the component sheet), `#FAFAF9`, mono uppercase labels.
  - Rows: min 44 high (32 on boards), padding 6 16, top border `line`, 13/18 (14/20 when not dense). Columns gap 16. Numbers right-aligned.
  - Two-line cell: 14 primary + 12 meta.
  - Selected row: `sel` + `inset 2px 0 0 acc`. Hover: `hover`.
- **Definition list**: grid of 160 key + `1fr`, padding 12 0, divider `line`. Key 14 meta, value 16/24.
- **Notice**: grid of 12 px mark + text, padding 12 14, `#FAFAF9`, 1 px `lineStrong`, r3. A bold lead-in in ink, then text in `text2`.
- **Menu**: white, 1 px `lineStrong`, r3, menu shadow. Items padding 8 14. Group labels use the label style. Disabled items show `off` text and a lock.
- **Modal**: top 96, centred, 600 wide, r6, modal shadow, on the scrim.
  - Head: padding 20 24 16, 18/600 title.
  - Body: padding 4 24 24, gap 20.
  - Foot: padding 14 24, `#FAFAF9`, top `line`. Mono audit text on the left ("Logs Marcus · 09:47"), buttons on the right, gap 10.
- **Stat strip**: card with equal cells, padding 14 16, dividers `line`. Label 13 meta, value 20/600, sub 12 meta.
- **Sparkline**: 72×20 (56×16 in rows), 1.5 px stroke, `text2`, round joins, end dot.
- **Progress bar**: 4 px high, `line` track, `text2` fill, r2.
- **Rule tag**: Mono 12/16, `text2`, `inset 0 0 0 1px lineStrong`, r2, padding 1 5. Example: `HS-04 v2`.
- **Log row**: grid of 64 mono time + text (14/20) and an optional 13/18 meta sub-line.

### Icons (12×12 viewBox; inline SVG)
- Ring (review): `M6 1.75a4.25 4.25 0 1 1 0 8.5a4.25 4.25 0 1 1 0-8.5Z`, stroke 1.5.
- Diamond (warn): `M6 0.9L11.1 6L6 11.1L0.9 6Z`, filled.
- Triangle (crit): `M6 1.2L11.4 10.6H0.6Z`, filled.
- Stale: the ring with `stroke-dasharray: 2.2 1.75`.
- Shadow: the ring plus a filled left half, `M6 1.75a4.25 4.25 0 0 0 0 8.5Z`.
- Paused: `M2.6 2h2.4v8H2.6ZM7 2h2.4v8H7Z`.
- Check: `M2.5 6.2l2.3 2.3 4.7-5`, stroke 1.8, round caps.
- Lock: a shackle path plus an 8×5.5 rect, r1.
- Chevron: 10×10, `M2 3.5l3 3 3-3`.

No icon library is used. Swap in the codebase's icon set only if it has exact equivalents for these shapes.

---

## The 10 product components (`designs/Countersign Components.dc.html`, light + dark)

**01 Status chip.** State is shown by colour, shape and word together.
- Compact: 22 high, padding 0 7 0 6, gap 6, r2, 12 px icon, 13/18.
- Comfortable (forms and signing): 30 high, padding 0 10 0 8, r3, 15 px icon, 16/24.
- Header size (cs-build): 24 high, 14/20.

| State | Icon | Border | Text | Example |
|---|---|---|---|---|
| Normal | none | none | meta 400, plain word | Within scope |
| Review | teal ring | 1 px rev | rev 600 | Review: 3 drafts |
| Warning | amber diamond | 1 px warn | warnT 600 | Edit rate rising |
| Critical | red triangle | 1 px crit | crit 600 | Wrong-patient draft · paused |
| Monitor stale | dashed ring, meta | **1 px dashed** icon | strong 600 | No data for 3h |
| Shadow | half ring, icon | 1 px lineStrong | meta 400 | Shadow |
| Paused | pause bars, icon | 1 px lineStrong | meta 400 | Paused by Marcus |

**02 Agent row** (division view, 32 high).
- Grid: `304 | 1fr | 40 | 76 | 56 | 56 | 56 | 224`, gap 12, padding 0 16.
- Columns: Status · rule (chip + rule tag) | Agent (name + mono version) | 24h | Signed as is | Edited | Blocked | 7 days (sparkline) | Privilege (compact ladder + level + grantor + review date).
- States: default; hover (`hover` background); selected (`sel` + 2 px `selBar` inset, name 600); keyboard focus (2 px ink outline, −2 offset).
- Data rules:
  - Warning rows show Edited in warnT 600.
  - Blocked > 0 shows in strong 600.
  - Stale rows show "—" in meta for every metric, and the sparkline turns dashed (2 2) in `off`.
  - Paused and stale rows hide the sparkline end dot.
- Sort: by status severity by default (header "Status · rule ↓").

**03 Exception item** (inbox).
- Grid: `8 | 176 | 1fr | 236 | 128 | 148`, gap 12, padding 12 16, top-aligned.
- Columns: new-dot | type chip | reason (13/600 when new) with agent + rule tag + "raised hh:mm" | action (13/600, "Review 3 drafts →") + sub-line | owner + "unclaimed / claimed 09:44" | deadline + "in 48 min".
- Lifecycle:
  - **New**: 6 px ink dot and a 600 title.
  - **Claimed**: no dot, 400.
  - **Overdue**: deadline in crit 600 ("Overdue 12 min"), sub-line "escalated to Priya".
  - **Resolved**: chip greys out (line border, off icon, meta text); the action column shows the outcome; deadline reads "Closed 10:21".
- Inbox control: segmented "Needs me · 4 / Daily digest · 6 / Log". Groups: Overdue, Due soon, Resolved today. Group headers are sunk rows with a mono uppercase label and count.

**04 Privilege card.**
- Card r6. Head: padding 14 16 12, with the status (icon + 13/600), mono ID on the right, activity title 16/600, scope line 13 meta, then the compact ladder + "Shadow now · Draft proposed".
- Body: rows on a 96 + `1fr` grid, padding 8 16 (Granted by, Evidence, Conditions, Review), then a footer note and an action.
- Five states:
  - Awaiting signature (teal) → **Review and sign**.
  - Active → **Open record**, with "3 step-down triggers armed".
  - Review due in 6 days → **Start review**, with "Lapses to Shadow if not re-signed".
  - Lapsed to Shadow (moved by `ORG-LAPSE-01`) → **Re-sign**.
  - Stepped down by rule (`MR-12 v1`).

**05 Autonomy ladder** (kept as built; alternatives were reviewed and rejected).
- **Full**: a 4-column card, cells min-h 80, padding 12 16.
  - Current: `#F4F3F1` fill, 600 name.
  - Proposed: `inset 0 0 0 2px ink`.
  - Passed: check icon, `text2` name.
  - Locked: `#FAFAF9`, lock icon, meta.
  - Each cell has an evidence line in mono 12.
- **Compact**: four segments, r1, either 8×8 with gap 2 (rows) or 28×6 with gap 3 (detail panels).
  - passed = `ladPass` fill · current = `ink` fill · proposed = 1.5 px ink outline · available = 1 px `off` outline · locked = `ladLock` fill.
  - Outline, not colour, marks a proposal.

**06 Policy vs instruction.** These must look different in greyscale.
- **Hard stop**:
  - Container: `#F4F3F1` body, **1.5 px ink border, r2**.
  - Header bar: ink background, white mono uppercase "HARD STOP · ENFORCED AT THE GATEWAY", lock icon, rule ID on the right.
  - Body: 18/600 title, 13 `text2` description, then a key/value grid (Owner, Version, Approved, Last 30 days: "Blocked 7 of 8,912 actions").
  - Footer: lock + "The agent can't edit or talk past this rule…".
- **Instruction**:
  - Container: white, 1 px `line`, **r6**.
  - Header: label "Instruction · in the agent's prompt" with a ghost **Edit** button.
  - Body: text in a `#FAFAF9` r4 well (16/24).
  - Footer: "Guidance only: the model may not follow it, so nothing safety-critical lives here."
- Never use dashed borders for instructions.

**07 Systems × verbs grid.**
- Columns: `1fr` + 6×96 (Read, Draft, Write, Submit, Sign, Order).
- Default is read only.
- Cell states:
  - granted: 16 px ink square, r3, white check.
  - not granted: 16 px, 1.5 px `off` border.
  - changed (needs re-approval): granted square + `box-shadow 0 0 0 2px #fff, 0 0 0 3.5px ink`.
  - locked by org policy: 28×20 `#F4F3F1` with a lock.
- **Sign and Order are always locked.** Name the policy once below the grid ("locked by `ORG-POL-02`").

**08 Impact preview (pause / resume).**
- **Pause** dialog: "Pause Med Rec Agent?"
  - Scope radio: this activity / this agent / every agent in the division (count).
  - "What happens" (e.g. "12 drafts in progress go back to pharmacists… Nothing is lost.").
  - Resume rule, optional reason textarea.
  - Footer: audit stamp, Cancel, **Pause agent** (primary).
- **Resume request**: who paused and for how long; a "Needs both" list (Marcus requesting, Priya pending); "Returns to" with each activity's level; a **required** reason; the status "Stays paused until Priya approves"; then Cancel and **Request resume**.

**09 Action trace.**
- Header: action title, `ACT-88213`, agent version · SOP · "acting for Ana R., PharmD · 7 West", and **Export for surveyor**.
- Steps sit on a vertical timeline with timestamps in mono at millisecond precision (`09:38:04.512`).
- Step types: Input, Tool call (mono function signature + result · latency), Policy passed, **Policy blocked** (expanded with what was proposed, what the gateway did, decision time · policy version · gateway node · linked exception), Output, Reviewer outcome.

**10 Monitor health indicator** (board headers).
- **Live**: 6 px `icon` dot + mono "Live · 09:42:17" in meta.
- **Delayed**: stronger words ("Delayed 6 min · last 09:36"), no colour.
- **Stale**: stale chip ("No data for 3h · last 06:41"). Numbers below are **withdrawn** ("—"), never shown as current. A "Last known at 06:41: …" line follows.

---

## Screens (each `.dc.html` is a canvas of 1440 px frames; frame IDs are badges in the file)

**Countersign Screens**
- **1a** Medications division view: 1440×900, live hover, click and Tab (`DivisionView.dc.html`).
- **1b** Privilege signing: Priya moves admission med rec from Shadow to Draft, 1440×1500 (`SignPrivilege.dc.html`).

**E1 Onboard an agent** (record shell: page header with a 6-step wizard; main column + 340 sidebar checklist)
- 1a Start from intake REQ-0093.
- 1b Job description: purpose, activities, never-list, acting-for, escalation, success criteria, rollout domain. Marcus returns at 5 of 7; the missing fields are listed.
- 1c Systems and verbs.
- 1d Tools and hard stops: each new stop shows how many recent cases it would have blocked. Send to Priya unlocks once all are tested.
- 1e Sponsor approval as one page.
- 1f Request changes on HS-11.
- 1g Returned to Sam: only HS-11 reopens and Priya's review resets.
- 1h Ready for review: the record is frozen.
- 1i Drafts in Inventory: Continue opens the first missing field.

**E2 Name the humans and review**
- 2a Division, sponsor, owner and technical owner are all required. A warning appears if the owner would supervise more than 7 activities.
- 2b Suggested risk tier with its factors. Changing it requires a reason.
- 2c One-page committee packet. Decisions: Approve / Approve with conditions / Re-review / Deny.
- 2d Decision logged; conditions carry onto the privilege.

**E3 Validate in shadow and go live**
- 3a Shadow scorecard against targets, with the miss explained by cause.
- 3b Sample case: agent and pharmacist side by side, line by line.
- 3c Sign the privilege. A missed target requires a written reason.
- 3d My privileges, with an overdue review.

**E4 Command Board**
- 4a Hospital view (divisions sorted by severity; fine = grey).
- 4b Division view, including Monitor stale.
- 4c Agent view: activities, privileges, metrics, recent actions.
- 4d Tile grid alternative.
- **4e Wall display: dark, no controls.**
- 4f Exceptions-first alternative.

**E5 Exception inbox**
- 5a Inbox + detail, sorted by deadline, delivery rules stated.
- 5b Dismiss requires a reason, and the reason tunes the rule.
- 5c Daily digest at 07:00.
- 5d Escalated to the sponsor when unanswered past the deadline.

**E6 Stop and resume**
- 6a Control menu: scope first, narrow fixes, program-lead actions locked.
- 6b Impact preview.
- 6c Return one activity to Shadow.
- 6d Resume requested.
- 6e Sponsor approves the resume.
- 6f Disable or retire. Retire needs a typed confirmation.

**E7 Replay and audit**
- 7a Action list: read only, filtered.
- 7b Action trace.
- 7c Incident record: commander, timeline, root cause, corrections.
- 7d Export for a surveyor.

**E8 Divisions and access**
- 8a Division settings, including the lapse policy.
- 8b People and roles per division.
- 8c Inventory row linked to operations.

**E9 Changes and unregistered**
- 9a A new version is held at the gateway until re-validated.
- 9b Unregistered caller flagged to Dana.

**E10 Clinician feedback**
- 10a Flag from Epic in one action, reason prefilled from Ana's edit.
- 10b "Fixed in v1.5.0". Epic is drawn as a neutral stand-in; **only the right-hand panel is ours**.

**E11 Reviewer behaviour**
- 11a Approval speed and edit rate next to blind independent checks.
- 11b Drill into a unit and shift. **Report by unit and shift, never by named pharmacist.**

**E12 RUAIH evidence**
- 12a Coverage of 14 agents × 7 Joint Commission / CHAI RUAIH elements. Gaps have owners and due dates.
- 12b Export packet, with gaps listed rather than hidden.

**E13 Review levels**
- 13a Level and its rules. Rules move the level; people can tighten by hand but never loosen.
- 13b Sampling queue.

**E14 Promote to Supervised**
- 14a The sponsor promotes **one branch** of an activity.
- 14b Above Tier 2, the board decides.

**E15 Step down automatically**
- 15a A threshold breach drops the activity Draft → Shadow.
- 15b A version change drops it Supervised → Draft. Moving back up always needs a signature.

Per-frame copy is final. Take it from the files.

---

## Interactions & behaviour
- **Division view rows** (live in `DivisionView` and `CountersignCore`):
  - Click selects (single selection).
  - Hover tints, unless the row is selected.
  - Tab focuses with a visible outline. Show focus rings only after Tab or Arrow keys; hide them on mousedown.
  - Rows are focusable (`tabIndex=0`). Add Enter/Space to open and Arrow up/down to move.
- **Gating**: submit or advance stays disabled (blocked style) until requirements are met, and the missing items are listed next to it (E1.2, E2.1, E1.4).
- **Two-person rules**: resume needs owner and sponsor, each with a reason (E6.3). Promotions above Tier 2 go to the board (E14.2). Moving up a level always needs a signature (E15).
- **Reasons are mandatory** for: signing with a missed target (E3.2), changing the suggested risk tier (E2.2), dismissing an exception (E5.3), and resuming (E6.3). Reasons are logged and stay on the record.
- **Severity routing**: critical exceptions page; minor ones go into the 07:00 digest; informational events go only to the log. Exceptions past their deadline escalate to the sponsor.
- **Hard-stop severity**: one block is a log entry. Three blocks on one rule in a day is Critical (pages). The threshold is set per rule (still to be specified).
- **Staleness**: when no data arrives within an agent's expected interval, the agent shows Monitor stale and its metrics are withdrawn.
- **Pause**: takes effect at the gateway within seconds. Queued work routes to humans and nothing is lost.
- **Destructive actions**: retire requires a typed confirmation. Program-lead-only actions appear locked (lock icon + `off` text) for other roles.
- **Read-only role** (Jordan): same screens with no mutating controls.
- **Versioning**: editing a live job description creates a new version and lists the affected privileges. Changed grid cells get the "changed" ring and go back for approval.

## State / data model (minimum)
- `Division { id, name, owner, sponsor, lapsePolicy, roles[] }`
- `Agent { id (AGT-0123), name, version, sop, divisionId, owner, techOwner, sponsor, riskTier, status, monitor { lastSeen, expectedInterval } }`
- `Activity { id, agentId, name, branches[], level: shadow|draft|supervised|autonomous, reviewLevel: tightened|normal|reduced }`
- `Privilege { id (PRV-0142), version, activityId, level, proposedLevel?, domain, conditions[], evidence, grantedBy, grantedAt, reviewDate, state: awaiting|active|due|lapsed|steppedDown, stepDownTriggers[] }`
- `HardStop { id (HS-04), version, text, owner, approvedBy, blocks30d }` · `Instruction { text, owner, sopVersion, editedAt }`
- `SystemGrant { system, verb: read|draft|write|submit|sign|order, granted, changed, lockedByPolicy? }`
- `Exception { id (EXC-5530), type, severity, reason, agentId, ruleId, raisedAt, action, owner, claimedAt?, deadline, state: new|claimed|overdue|resolved|dismissed, dismissReason?, escalatedTo? }`
- `Action { id (ACT-88213), agentVersion, actingFor, steps: [{ t, type, detail, policy?, decision? }], reviewerOutcome }`
- `Incident { commander, timeline[], rootCause, corrections[], linkedActions[] }`
- `ResumeRequest { requestedBy, reason, approvals: [{ who, reason, at }] }`
- The board is a live feed: show monitor freshness in every board header.

## Known open issues / decisions to confirm
1. **Ring overload.** Review, stale and Shadow are all circles. If solid vs dashed fails at 12 px on the wall display, stale becomes a dashed square.
2. **Wall display scale.** 12 px mono doesn't read across a room. 4e needs its own type scale.
3. **Dialog elevation.** The component sheet shows the impact-preview dialog flat (border, no shadow). Built screens use the modal shadow. Use the shadow.
4. v3 epics E16–E21 aren't designed. Their stories are in `reference/epics-and-stories.txt`.

## Assets
- Fonts: IBM Plex Sans and IBM Plex Mono (Google Fonts, OFL).
- Icons: inline SVG paths, listed above.
- No raster images. Epic EHR screens are neutral stand-ins, not real Epic UI. Don't reproduce Epic's UI.

## Files
- `designs/Countersign Components.dc.html`: the 10 components, design flags, dark mode. Imports `CountersignCore.dc.html` (components 01–03 with a light/dark `mode` prop and contrast readouts).
- `designs/Countersign Screens.dc.html`: imports `DivisionView.dc.html` and `SignPrivilege.dc.html`.
- `designs/E1 Onboarding Countersign.dc.html` … `designs/E15 Step Down.dc.html`: the epics. Each file links to the others via the epic strip at the top.
- `designs/support.js`: runtime needed only to view the references.
- `reference/cs-build.js`: tokens (`C`) and every primitive helper used to build E2–E15.
- `reference/epics-and-stories.txt`: stories and acceptance criteria (E1–E21).
- `reference/source-docs/`: PRD, Vision, Roadmap, Epics, Design system brief (.docx).
