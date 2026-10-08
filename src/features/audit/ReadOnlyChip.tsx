import { useDemo } from '../../store'
import styles from './audit.module.css'

/** "Read only · risk manager" (7a, 7b), shown to read-only personas. */
export function ReadOnlyChip() {
  const person = useDemo((s) =>
    s.roles.some((r) => r.personId === s.personaId && r.role === 'readOnly')
      ? s.people.find((p) => p.id === s.personaId)
      : null,
  )
  return person ? (
    <span className={styles.readOnly}>Read only · {person.title.toLowerCase()}</span>
  ) : null
}
