import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import styles from './RadioCardGroup.module.css'

export interface RadioCardOption<T extends string> {
  value: T
  title: ReactNode
  description?: ReactNode
  disabled?: boolean
}

export interface RadioCardGroupProps<T extends string> {
  name: string
  value: T | null
  onChange: (value: T) => void
  options: RadioCardOption<T>[]
  'aria-label'?: string
  /** Lay the cards out side by side, e.g. 4 tiers in a row (2b). Default: stacked. */
  columns?: number
}

export function RadioCardGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  columns,
}: RadioCardGroupProps<T>) {
  const refs = useRef<Array<HTMLDivElement | null>>([])
  const enabled = options.map((option, i) => (option.disabled ? -1 : i)).filter((i) => i >= 0)
  const selectedIndex = options.findIndex((option) => option.value === value)
  const tabStop = selectedIndex >= 0 ? selectedIndex : (enabled[0] ?? -1)

  const select = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    refs.current[index]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key]
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      select(index)
      return
    }
    if (!step || enabled.length === 0) return
    event.preventDefault()
    const position = enabled.indexOf(index)
    const next = enabled[(position + step + enabled.length) % enabled.length]
    if (next !== undefined) select(next)
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={styles.group}
      data-name={name}
      style={columns ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option, index) => {
        const checked = option.value === value
        return (
          <div
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            role="radio"
            aria-checked={checked}
            aria-disabled={option.disabled || undefined}
            tabIndex={index === tabStop ? 0 : -1}
            className={cx(styles.card, checked && styles.checked, option.disabled && styles.disabled)}
            onClick={() => select(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <span className={styles.circle}>{checked ? <span className={styles.dot} /> : null}</span>
            <span className={styles.text}>
              <span className={styles.title}>{option.title}</span>
              {option.description ? <span className={styles.description}>{option.description}</span> : null}
            </span>
          </div>
        )
      })}
    </div>
  )
}
