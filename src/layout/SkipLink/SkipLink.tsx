import type { MouseEvent } from 'react'
import styles from './SkipLink.module.css'

/** The first Tab stop: jumps past the prototype bar and the top nav to the page (Phase 9 R2). */
export function SkipLink() {
  const skip = (event: MouseEvent<HTMLAnchorElement>) => {
    // Focus the page without a `#main` entry in the history.
    event.preventDefault()
    document.getElementById('main')?.focus()
  }
  return (
    <a href="#main" className={styles.skip} onClick={skip}>
      Skip to content
    </a>
  )
}
