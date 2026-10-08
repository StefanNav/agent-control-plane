import type { ReactNode } from 'react'
import styles from './Field.module.css'

export interface FieldProps {
  label: ReactNode
  htmlFor: string
  /** Right-aligned note on the label row, e.g. "Required" or "5 of 7". */
  hint?: ReactNode
  help?: ReactNode
  children: ReactNode
}

export function Field({ label, htmlFor, hint, help, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={htmlFor} className={styles.label}>
          {label}
        </label>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </div>
      {help ? <span className={styles.help}>{help}</span> : null}
      {children}
    </div>
  )
}
