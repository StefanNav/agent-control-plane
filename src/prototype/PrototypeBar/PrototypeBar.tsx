import { Link, useNavigate } from 'react-router'
import { useDemo } from '../../store'
import { PersonaSwitcher } from '../PersonaSwitcher/PersonaSwitcher'
import styles from './PrototypeBar.module.css'

/** Demo controls above the product UI. Stories arrive in Phase 8. */
export function PrototypeBar() {
  const navigate = useNavigate()
  const reset = useDemo((s) => s.reset)
  return (
    <div className={styles.bar} role="region" aria-label="Prototype controls">
      <Link to="/" className={styles.brand}>
        Signal · Agent Control Plane · <span className={styles.tag}>Prototype</span>
      </Link>
      <div className={styles.controls}>
        <PersonaSwitcher />
        <span className={styles.muted}>Stories</span>
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            reset()
            navigate('/operations/divisions/medications')
          }}
        >
          Reset demo
        </button>
        <Link to="/about" className={styles.link}>
          About
        </Link>
      </div>
    </div>
  )
}
