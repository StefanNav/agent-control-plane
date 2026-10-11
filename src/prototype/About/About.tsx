import { Fragment, useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import type from '../../design-system/type.module.css'
import { cx } from '../../lib/cx'
import { REPO_URL } from '../copy'
import { CARDS, type CardContent } from '../tour/cards'
import {
  CONFLICT,
  DIRECTIONS,
  JUDGED,
  decision,
  type Decision,
  type ImageCard,
} from '../tour/decisionCards'
import { DecisionContent } from '../tour/DecisionContent'
import type { Chapter } from '../tour/types'
import { typographic } from '../tour/typographic'
import { ZoomImage } from '../tour/ZoomImage'
import styles from './About.module.css'
import { CASE_CHAPTERS, cardIds, liveLink, paragraphs, playLink } from './caseStudy'

const PRINCIPLES = [
  'Human attention is the scarce resource. Spend it where it matters instead of adding approvals.',
  'Scrutinize the job, not every click. The heaviest review happens at onboarding and when a privilege changes.',
  'Hard stops live outside the model. Enforced rules and advisory instructions look different, and an agent can’t argue past a rule.',
  'Adverse actions stay human. Changing a dose, ordering and signing are locked to people at every level.',
  'Autonomy is earned per activity and within a domain, never for an agent as a whole and never without evidence.',
  'Review moves by written rules: it loosens as evidence builds and tightens on change or harm.',
  'Every privilege has a named grantor, recorded and signed.',
  'Stop easy, resume deliberate. One action pauses; resuming takes the owner and the sponsor.',
  'Quiet by default. Normal is grey; only “a human is needed” gets colour, with an action, an owner and a deadline.',
  'Meet clinicians where they work. Pharmacists review and flag in Epic; the console is for the people accountable.',
]

/** The tour isn't running on this page, so an image opens larger without pausing anything. */
const ZOOM = { playing: false, onPause: () => {} }

/** Which of the three decisions each reveal on the decisions page brings in. */
const DECISION_REVEALS: Record<string, 1 | 2 | 3> = { d1: 1, d2: 2, d3: 3 }

function Excerpt({ card }: { card: Extract<CardContent, { kind: 'excerpt' }> }) {
  return (
    <figure className={cx(styles.card, styles.excerpt)}>
      <blockquote className={styles.quote}>
        <p>{card.quote}</p>
      </blockquote>
      <figcaption className={styles.source}>{card.source}</figcaption>
    </figure>
  )
}

function StoryCard({ card }: { card: Extract<CardContent, { kind: 'story' }> }) {
  return (
    <div className={cx(styles.card, styles.excerpt)}>
      <span className={type.label}>{card.epic}</span>
      <p className={styles.quote}>{card.story}</p>
      <span className={type.label}>Acceptance criterion</span>
      <p>{card.criterion}</p>
    </div>
  )
}

/** An image: its thumbnail, at a sheet's shape or a screen's, then its name and one line. */
function Exploration({ card, shape }: { card: ImageCard; shape: 'tall' | 'wide' }) {
  return (
    <figure className={styles.figure}>
      <ZoomImage image={card} title={card.title} className={styles[shape]} {...ZOOM} />
      <figcaption className={cx(styles.caption, type.dense)}>
        {card.title ? <span className={styles.name}>{card.title}</span> : null}
        <span>{card.caption}</span>
      </figcaption>
    </figure>
  )
}

/** A decision beside the screen it played out on. */
function DecisionPanel({ card }: { card: Decision }) {
  const titleId = useId()
  return (
    <div role="group" aria-labelledby={titleId} className={cx(styles.card, styles.decision)}>
      <div className={styles.decisionBody}>
        <DecisionContent content={card} titleId={titleId} headingLevel={3} />
      </div>
      {card.screen ? (
        <figure className={styles.figure}>
          <ZoomImage image={card.screen} {...ZOOM} />
          <figcaption className={type.meta}>{card.screen.caption}</figcaption>
        </figure>
      ) : null}
    </div>
  )
}

/** A titled run of explorations. */
function Explorations({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <div role="group" aria-labelledby={titleId} className={styles.group}>
      <h3 id={titleId} className={cx(styles.groupTitle, type.ui)}>
        {title}
      </h3>
      <div className={className}>{children}</div>
    </div>
  )
}

/**
 * What the decisions page brings in at a reveal: the decision itself, or Decision 2's explorations,
 * the five directions and where the first broke, then the same crowded screens every one was judged
 * on. Any other reveal brings in nothing here; the narration says what the page shows.
 */
function Revealed({ reveal }: { reveal: string }) {
  const n = DECISION_REVEALS[reveal]
  if (n) return <DecisionPanel card={decision(`decision-${n}`)} />
  if (reveal === 'directions')
    return (
      <Explorations title="Five directions from one brief" className={styles.directions}>
        {DIRECTIONS.map((card) => (
          <Exploration key={card.src} card={card} shape="tall" />
        ))}
        <div className={styles.conflict}>
          <Exploration card={CONFLICT} shape="wide" />
        </div>
      </Explorations>
    )
  if (reveal === 'judged')
    return (
      <Explorations title="Judged on the same real, crowded screens" className={styles.judged}>
        {JUDGED.map((card) => (
          <Exploration key={card.src} card={card} shape="wide" />
        ))}
      </Explorations>
    )
  return null
}

function ChapterCard({ id }: { id: string }) {
  const card = CARDS[id]
  if (!card) throw new Error(`No card ${id}`)
  switch (card.kind) {
    case 'excerpt':
      return <Excerpt card={card} />
    case 'story':
      return <StoryCard card={card} />
    case 'decision':
      return <DecisionPanel card={card} />
    case 'image':
      return <Exploration card={card} shape="wide" />
  }
}

/** One chapter of the tour, read: its narration, the cards it puts up, and where to see it live. */
function ChapterSection({ chapter }: { chapter: Chapter }) {
  const titleId = useId()
  const live = liveLink(chapter)
  const cards = cardIds(chapter)
  return (
    <section aria-labelledby={titleId} className={cx(styles.section, styles.chapter)}>
      <h2 id={titleId} className={type.sectionTitle}>
        {chapter.title}
      </h2>
      {paragraphs(chapter).map((paragraph) => (
        <Fragment key={paragraph.text}>
          <p>{typographic(paragraph.text)}</p>
          {paragraph.reveal ? <Revealed reveal={paragraph.reveal} /> : null}
        </Fragment>
      ))}
      {cards.map((id) => (
        <ChapterCard key={id} id={id} />
      ))}
      <p className={styles.links}>
        <Link to={playLink(chapter)} aria-describedby={titleId} className={styles.link}>
          Play from here
        </Link>
        {live ? (
          <Link to={live.to} aria-describedby={titleId} className={styles.link}>
            {live.label}
          </Link>
        ) : null}
      </p>
    </section>
  )
}

/** A section of the page's own: a heading and what it says. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className={styles.section}>
      <h2 id={titleId} className={type.sectionTitle}>
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * The case study (guided-tour spec §6): the tour in reading form, a chapter at a time, written from
 * the tour's own data. Then the principles, the design system and how it's built.
 */
export function About() {
  return (
    <article className={styles.page}>
      <header className={styles.head}>
        <h1 className={type.pageTitle}>About this work</h1>
        <span className={type.mono}>Attune · Agent Control Plane</span>
        <p className={styles.lead}>
          This is the guided tour in reading form: the same story in the same order, with its cards,
          and images that open full size.{' '}
          <Link to="/?tour=open" className={styles.link}>
            Play the tour
          </Link>{' '}
          from the start, or from any chapter below.
        </p>
        <p className={styles.lead}>
          Attune, Lakeshore Health and everyone in it are fictional, and nothing you do leaves your
          browser.
        </p>
      </header>

      {CASE_CHAPTERS.map((chapter) => (
        <ChapterSection key={chapter.id} chapter={chapter} />
      ))}

      <Section title="Principles">
        <ul className={styles.list}>
          {PRINCIPLES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Section>

      <Section title="Countersign, the design system">
        <p>
          Every screen is built from Countersign: IBM Plex Sans and Mono, a grey base, and colour
          only where a person must act. Indigo is the primary action and what’s selected, teal is a
          review waiting, amber and red are warnings. Every status pairs colour with a shape and a
          word, so it reads in greyscale, and dashed means no data, never healthy.
        </p>
        <p>
          <Link to="/about/components" className={styles.link}>
            See the components
          </Link>
        </p>
      </Section>

      <Section title="How it’s built">
        <p>
          Vite, React 19, TypeScript, React Router, Zustand and CSS Modules, with no UI library. 55
          designed frames across 15 epics, built over 10 build phases, each one a reviewed pull
          request. The guided tour is part of the same build: its narration is data in the repo, and
          it drives the real screens.
        </p>
        <p>
          <a href={REPO_URL} className={styles.link}>
            Source on GitHub
          </a>
        </p>
      </Section>
    </article>
  )
}
