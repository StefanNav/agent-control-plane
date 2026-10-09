import type { ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import styles from './Segmented.module.css'

export interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode; sub?: ReactNode }[]
  /** `choice` = equal-grid segmented choice in forms; `control` = compact switch (inbox). */
  variant?: 'choice' | 'control'
  'aria-label'?: string
  /** Shown but not changeable, e.g. for a read-only viewer. */
  disabled?: boolean
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  variant = 'choice',
  'aria-label': ariaLabel,
  disabled = false,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx(styles[variant])}
      style={variant === 'choice' ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const on = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            aria-disabled={disabled || undefined}
            className={cx(styles.segment, on && styles.on)}
            onClick={() => {
              if (!disabled) onChange(option.value)
            }}
          >
            <span className={styles.label}>{option.label}</span>
            {option.sub && variant === 'choice' ? <span className={styles.sub}>{option.sub}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
