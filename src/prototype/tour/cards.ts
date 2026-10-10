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
    }
  | { kind: 'excerpt'; quote: string; source: string }
  | { kind: 'story'; epic: string; story: string; criterion: string }
  | { kind: 'image'; src: string; alt: string; caption: string }

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
}
