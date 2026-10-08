import styles from './RuleTag.module.css'

export interface RuleTagProps {
  /** Rule ID and version, e.g. "HS-04 v2". */
  children: string
}

export function RuleTag({ children }: RuleTagProps) {
  return <span className={styles.tag}>{children}</span>
}
