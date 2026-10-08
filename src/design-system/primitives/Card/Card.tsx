import type { HTMLAttributes } from 'react'
import { cx } from '../../../lib/cx'
import styles from './Card.module.css'

export type CardProps = HTMLAttributes<HTMLDivElement>

/** White surface, 1px `line`, r6. Tables and lists sit inside cards. */
export function Card({ className, ...rest }: CardProps) {
  return <div className={cx(styles.card, className)} {...rest} />
}
