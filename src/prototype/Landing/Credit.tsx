import type from '../../design-system/type.module.css'
import styles from './Credit.module.css'

export interface CreditProps {
  /** Who narrates the tour. */
  name: string
  /** A square photo of them, shown round at 48 px (a 160 px file stays sharp at 2×). Text only until there is one. */
  src?: string
}

/** "Narrated by Stefan", with a small round photo beside it once there is one. */
export function Credit({ name, src }: CreditProps) {
  return (
    <p className={styles.credit}>
      {src ? <img className={styles.photo} src={src} alt={name} width={48} height={48} /> : null}
      <span className={type.meta}>Narrated by {name}</span>
    </p>
  )
}
