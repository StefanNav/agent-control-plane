import type from '../../design-system/type.module.css'
import styles from './Credit.module.css'

export interface CreditProps {
  /** Who narrates the tour. */
  name: string
  /** A square photo of them, shown round at 48 px (a 144 px file stays sharp at 3×). Text only until there is one. */
  src?: string
}

/**
 * "Narrated by Stefan", with a small round photo beside it once there is one. The photo is
 * decoration (empty alt, Ruling 33): the text beside it already names the person.
 */
export function Credit({ name, src }: CreditProps) {
  return (
    <p className={styles.credit}>
      {src ? <img className={styles.photo} src={src} alt="" width={48} height={48} /> : null}
      <span className={type.meta}>Narrated by {name}</span>
    </p>
  )
}
