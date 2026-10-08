import { Link } from 'react-router'
import styles from './PrototypeBar.module.css'

/** Demo controls above the product UI. Persona switching and Reset arrive in Phase 2; Stories in Phase 8. */
export function PrototypeBar() {
  return (
    <div className={styles.bar} role="region" aria-label="Prototype controls">
      <Link to="/" className={styles.brand}>
        Signal · Agent Control Plane · <span className={styles.tag}>Prototype</span>
      </Link>
      <div className={styles.controls}>
        <span>
          Viewing as <strong className={styles.strong}>Marcus</strong> · Agent owner
        </span>
        <span className={styles.muted}>Stories</span>
        <span className={styles.muted}>Reset demo</span>
        <Link to="/about" className={styles.link}>
          About
        </Link>
      </div>
    </div>
  )
}
