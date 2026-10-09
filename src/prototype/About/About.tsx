import { Link } from 'react-router'
import type from '../../design-system/type.module.css'
import { REPO_URL } from '../copy'
import styles from './About.module.css'

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

const HOW_TO = [
  'Pick a story on the start page or from Stories in the bar. Each one switches to its person and loads the moment it starts from.',
  'Or explore freely. “Viewing as” switches person, and what each person can do changes with them; a locked control says who can use it.',
  'Actions really change the mock data, and your browser keeps it. Reset demo puts everything back.',
  'It is built for desktop screens, 1280 px and wider.',
]

/** Case-study context (spec §4.6), written from the Vision and PRD with Signal as the brand. */
export function About() {
  return (
    <article className={styles.page}>
      <header className={styles.head}>
        <h1 className={type.pageTitle}>About this prototype</h1>
        <span className={type.mono}>Signal · Agent Control Plane</span>
      </header>

      <section className={styles.section}>
        <h2 className={type.sectionTitle}>What it is</h2>
        <p>
          A front-end prototype of Agent Control Plane, the operations side of Signal’s AI
          management system (AIMS) for hospitals. Named people bring AI agents on, grant them staged
          privileges, supervise them live, stop them and produce the audit evidence. Signal,
          Lakeshore Health and everyone in it are fictional, and nothing you do leaves your browser.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={type.sectionTitle}>The problem</h2>
        <p>
          Hospitals buy agents to hand off work, not to watch them. Today that hand-off is stuck at
          “a person signs everything”, which turns into rubber-stamping as agents multiply. Nobody
          has a safe, evidence-based way to decide when an agent has earned more responsibility, or
          who answers for it when it acts.
        </p>
        <p>
          Agent Control Plane treats it as delegation: an agent gets a written job, limits it can’t
          talk its way past, a named person for every privilege, and more autonomy one activity at a
          time, only on evidence.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={type.sectionTitle}>Principles</h2>
        <ul>
          {PRINCIPLES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={type.sectionTitle}>Countersign, the design system</h2>
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
      </section>

      <section className={styles.section}>
        <h2 className={type.sectionTitle}>How to use it</h2>
        <ul>
          {HOW_TO.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={type.sectionTitle}>How it’s built</h2>
        <p>
          Vite, React 19, TypeScript, React Router, Zustand and CSS Modules, with no UI library. 55
          designed frames across 15 epics, built in reviewed phases.
        </p>
        <p>
          <a href={REPO_URL} className={styles.link}>
            Source on GitHub
          </a>
        </p>
      </section>
    </article>
  )
}
