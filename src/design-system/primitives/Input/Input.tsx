import type { InputHTMLAttributes } from 'react'
import { cx } from '../../../lib/cx'
import { Icon } from '../../icons/Icon'
import styles from './Input.module.css'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Read-only field set elsewhere: neutral fill, lock icon. */
  locked?: boolean
}

export function Input({ locked = false, className, readOnly, ...rest }: InputProps) {
  return (
    <div className={cx(styles.box, locked && styles.locked, className)}>
      <input className={styles.input} readOnly={locked || readOnly} {...rest} />
      {locked ? <Icon name="lock" color="var(--cs-meta)" /> : null}
    </div>
  )
}
