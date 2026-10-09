import { useSyncExternalStore, type ReactNode } from 'react'
import type from '../../design-system/type.module.css'
import { PITCH, REPO_URL } from '../copy'
import { PERSONAS } from '../personas'
import { storyById } from '../stories'
import styles from './DesktopGate.module.css'

const WIDE = '(min-width: 1024px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(WIDE)
  if (!query) return () => {}
  // Safari before 14 has only the older listener API.
  if (typeof query.addEventListener !== 'function') {
    query.addListener(onChange)
    return () => query.removeListener(onChange)
  }
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** True at 1024 px and wider, or when the browser can't tell (spec §4.7, R11). */
function useWideEnough(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(WIDE).matches : true),
    () => true,
  )
}

/** Below 1024 px nothing of the app renders: a page that says so instead. */
export function DesktopGate({ children }: { children: ReactNode }) {
  if (useWideEnough()) return children
  return (
    <main className={styles.page}>
      <span className={type.mono}>Signal · Agent Control Plane · Prototype</span>
      <h1 className={type.pageTitle}>Best viewed on a desktop</h1>
      <p className={styles.strong}>
        This prototype is designed for screens 1024 px and wider. Open it on a laptop or desktop to
        click through it.
      </p>
      <p>{PITCH}</p>
      <h2 id="gate-people" className={type.label}>
        Seven people use it
      </h2>
      <ul aria-labelledby="gate-people" className={styles.people}>
        {PERSONAS.map((persona) => (
          <li key={persona.id}>
            <strong>
              {persona.name} · {persona.roleLabel}
            </strong>
            <span>{storyById(persona.id)?.summary}</span>
          </li>
        ))}
      </ul>
      <a href={REPO_URL} className={styles.link}>
        Source on GitHub
      </a>
    </main>
  )
}
