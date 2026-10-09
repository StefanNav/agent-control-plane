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
export const CARDS: Record<string, CardContent> = {}
