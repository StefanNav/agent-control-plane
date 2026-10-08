import type { SelectHTMLAttributes } from 'react'
import { cx } from '../../../lib/cx'
import { Icon } from '../../icons/Icon'
import styles from './Select.module.css'

export type SelectProps<T extends string> = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'value' | 'onChange'
> & {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  locked?: boolean
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  locked = false,
  className,
  ...rest
}: SelectProps<T>) {
  return (
    <div className={cx(styles.box, locked && styles.locked, className)}>
      <select
        className={styles.select}
        value={value}
        disabled={locked}
        onChange={(event) => onChange(event.target.value as T)}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className={styles.mark}>
        {locked ? <Icon name="lock" color="var(--cs-meta)" /> : <Icon name="chevron" size={10} />}
      </span>
    </div>
  )
}
