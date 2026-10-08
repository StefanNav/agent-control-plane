import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import styles from './FilterPill.module.css'

export type FilterPillProps = Omit<ComponentPropsWithRef<'button'>, 'type' | 'onClick'> & {
  on: boolean
  onClick: () => void
  children: ReactNode
}

/** A toggle filter; with `aria-haspopup` it can also open a Menu (React 19 passes `ref` as a prop). */
export function FilterPill({ on, onClick, children, className, ...rest }: FilterPillProps) {
  return (
    <button type="button" aria-pressed={rest['aria-haspopup'] ? undefined : on} className={cx(styles.pill, on && styles.on, className)} onClick={onClick} {...rest}>
      {children}
    </button>
  )
}
