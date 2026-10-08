import type { ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import { Icon } from '../../icons/Icon'
import styles from './Checkbox.module.css'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  /** Secondary line under the label. */
  description?: ReactNode
  disabled?: boolean
  id?: string
}

export function Checkbox({ checked, onChange, label, description, disabled = false, id }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      className={cx(styles.row, disabled && styles.disabled)}
      onClick={() => {
        if (!disabled) onChange(!checked)
      }}
    >
      <span className={cx(styles.box, checked && styles.checked)}>
        {checked ? <Icon name="check" size={11} color="var(--cs-on-acc)" /> : null}
      </span>
      {label || description ? (
        <span className={styles.text}>
          {label ? <span className={styles.label}>{label}</span> : null}
          {description ? <span className={styles.description}>{description}</span> : null}
        </span>
      ) : null}
    </button>
  )
}
