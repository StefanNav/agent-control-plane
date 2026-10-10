/** An image the tour shows: a design exploration, or a screen of the prototype. */
export interface TourImage {
  src: string
  /** What the image shows. */
  alt: string
  /** Its size in pixels, so the page keeps its room before it loads. */
  width: number
  height: number
  caption: string
}

/** What a tour card shows (spec §4.3). A `card` action names one of `CARDS` by its key. */
export type CardContent =
  | {
      kind: 'decision'
      /** Which of the three decisions. */
      n: 1 | 2 | 3
      title: string
      /** The options weighed; the chosen one is marked. */
      options: { label: string; chosen?: boolean }[]
      /** The line after "Trade-off: ". */
      tradeoff: string
      /** The screen the decision played out on (Ruling 30). */
      screen?: TourImage
    }
  | { kind: 'excerpt'; quote: string; source: string }
  | { kind: 'story'; epic: string; story: string; criterion: string }
  /** `title`, when there is one, names the image above its caption: a direction, a stage. */
  | ({ kind: 'image'; title?: string } & TourImage)

/** The tour's cards by id; each chapter adds its own. */
export const CARDS: Record<string, CardContent> = {
  // onboarding: verbatim from the About page's principles (Ruling 23)
  'hard-stops-outside': {
    kind: 'excerpt',
    quote:
      'Hard stops live outside the model. Enforced rules and advisory instructions look different, and an agent can’t argue past a rule.',
    source: 'Product principles',
  },
  // problem: spec §7.3, quoted from the cited source, labelled only "Research notes" (Ruling 23)
  'research-r1': {
    kind: 'excerpt',
    quote:
      'Plan-level oversight lowers the odds of a problematic action by 76%; runtime interception catches about 1 in 5 bad actions.',
    source: 'Research notes · Chen et al. 2026 (preprint)',
  },
  'research-r2': {
    kind: 'excerpt',
    quote:
      'Clinicians show strong automation bias; explanations raise acceptance whether the AI is right or wrong.',
    source: 'Research notes · Jabbour et al., JAMA 2023; Bansal et al., CHI 2021',
  },
  'research-r3': {
    kind: 'excerpt',
    quote: "start in a shadow-like mode, then 'earn' autonomy.",
    source: 'Research notes · UCHealth',
  },
  // decisions: spec §7.2 as the script tells them; each card's screen is captured from the
  // prototype by `tests/capture/decisions.spec.ts` (Ruling 30)
  'decision-1': {
    kind: 'decision',
    n: 1,
    title: 'How an agent earns trust',
    options: [
      { label: 'A person approves every action' },
      { label: 'Trust the agent as a whole' },
      { label: 'Each task earns its own privilege, signed by a named person', chosen: true },
    ],
    tradeoff: 'More work up front, a lot less checking after',
    screen: {
      src: '/tour/artifacts/decision-1-sign.jpg',
      alt: 'The sign page: Priya moves admission med rec from Shadow to Draft, with its scope, hard stops, review date and step-down triggers above the shadow evidence',
      width: 1440,
      height: 820,
      caption: 'Signing a privilege, as Priya',
    },
  },
  'decision-2': {
    kind: 'decision',
    n: 2,
    title: 'How to protect people’s attention',
    // The five design system directions, each with the attribute it led with (the handoff).
    options: [
      { label: 'Ledger · precise' },
      { label: 'Ward Round · fast to read' },
      { label: 'Countersign · accountable', chosen: true },
      { label: 'Linen · calm' },
      { label: 'Handover · calm + accountable' },
    ],
    tradeoff: 'Less colour at a glance, so the colour that does appear is believed',
    screen: {
      src: '/tour/artifacts/decision-2-division.jpg',
      alt: 'The Medications division view: twenty agents, healthy rows in grey, and the four that need a person marked with a shape and a word',
      width: 1440,
      height: 820,
      caption: 'The Medications division view, as Marcus',
    },
  },
  'decision-3': {
    kind: 'decision',
    n: 3,
    title: 'How to stop and restart',
    options: [
      { label: 'One person resumes' },
      { label: 'It resumes on its own after a fix' },
      { label: 'Stopping takes one person; starting again takes two', chosen: true },
    ],
    tradeoff: 'Slower recovery, on purpose',
    screen: {
      src: '/tour/artifacts/decision-3-resume.jpg',
      alt: 'Med Rec Agent, paused: Marcus asks to resume and it needs both Marcus and Priya, with Marcus’s reason and what changed since the pause',
      width: 1440,
      height: 820,
      caption: 'Resuming Med Rec Agent, as Priya',
    },
  },
  // Decision 2's explorations: the five direction overviews, then the screens they were judged on.
  // Names, lines and reasons from the explorations handoff.
  'explore-ledger': {
    kind: 'image',
    src: '/tour/artifacts/explore-ledger.jpg',
    alt: 'Ledger’s overview sheet: type scale, cool slate neutrals, one indigo for selection, action and review, status chips and a slice of the division view',
    width: 1600,
    height: 2110,
    title: 'Ledger',
    caption: 'The brief as written: cool slate, and one indigo for selection, action and review',
  },
  'explore-ward-round': {
    kind: 'image',
    src: '/tour/artifacts/explore-ward-round.jpg',
    alt: 'Ward Round’s overview sheet: a larger low-vision typeface, every figure in mono, warm stone neutrals, a violet for your move and a slice of the division view',
    width: 1600,
    height: 2156,
    title: 'Ward Round',
    caption: 'Legibility first: larger type, every figure in mono, warm stone neutrals',
  },
  'explore-countersign': {
    kind: 'image',
    src: '/tour/artifacts/explore-countersign.jpg',
    alt: 'Countersign’s overview sheet: hairlines, denser type, warm grey neutrals, indigo for action, teal for review and a slice of the division view with the signer on every row',
    width: 1600,
    height: 2080,
    title: 'Countersign',
    caption: 'Accountability first: hairlines, review in its own teal, the signer on every row',
  },
  'explore-linen': {
    kind: 'image',
    src: '/tour/artifacts/explore-linen.jpg',
    alt: 'Linen’s overview sheet: warm, borderless and tonal, with soft bands on rows that need a person and a slice of the division view',
    width: 1600,
    height: 2136,
    title: 'Linen',
    caption: 'Calm and tonal: no lines, and only the selection lifts off the page',
  },
  'explore-handover': {
    kind: 'image',
    src: '/tour/artifacts/explore-handover.jpg',
    alt: 'Handover’s overview sheet: Linen’s surfaces with Ward Round’s ink selection and Countersign’s rule IDs and grantors, in two row treatments',
    width: 1600,
    height: 2810,
    title: 'Handover',
    caption: 'A remix: Linen’s surfaces, Ward Round’s selection, Countersign’s accountability',
  },
  'explore-ledger-conflict': {
    kind: 'image',
    src: '/tour/artifacts/explore-ledger-conflict.jpg',
    alt: 'The Medications division view in Ledger: the selected Discharge Meds Agent row and the “Review: 3 drafts” row are both indigo',
    width: 1600,
    height: 1000,
    title: 'Ledger, on a crowded screen',
    caption:
      'The selected row and “needs review” were both indigo, so the selection read as one more problem',
  },
  'explore-stress-division': {
    kind: 'image',
    src: '/tour/artifacts/explore-stress-division.jpg',
    alt: 'The Medications division view in Countersign: twenty agents on hairlines, a teal review chip and a neutral selected row',
    width: 1600,
    height: 1000,
    title: 'Countersign · the division view',
    caption:
      'Stress test: 20 agents at 1440 × 900, the same data and selected row in every direction',
  },
  'explore-stress-signing': {
    kind: 'image',
    src: '/tour/artifacts/explore-stress-signing.jpg',
    alt: 'Signing a privilege in Countersign: Priya moves admission med rec from Shadow to Draft',
    width: 1600,
    height: 1968,
    title: 'Countersign · signing',
    caption: 'Stress test: the same privilege signed in every direction',
  },
  'explore-final-division': {
    kind: 'image',
    src: '/tour/artifacts/explore-final-division.jpg',
    alt: 'The final Medications division view on the locked Countersign tokens: a boxed table, outlined chips and rule tags, an indigo selection and teal for review',
    width: 1600,
    height: 1000,
    title: 'Final · the division view',
    caption: 'On the locked tokens: healthy stays grey, and teal only ever means review waiting',
  },
}
