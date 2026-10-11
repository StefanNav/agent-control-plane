import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from '../../../lib/cx'
import type { ButtonVariant } from './Button'
import styles from './Button.module.css'

export interface LinkButtonProps {
  to: string
  variant?: Exclude<ButtonVariant, 'blocked'>
  size?: 'md' | 'sm'
  icon?: ReactNode
  children: ReactNode
  className?: string
  /** Names the link for the tour and the stories (`data-story-target`). */
  'data-story-target'?: string
}

/** A navigation link that looks like a button (navigation stays a real link). */
export function LinkButton({ to, variant = 'secondary', size = 'md', icon, children, className, 'data-story-target': storyTarget }: LinkButtonProps) {
  return (
    <Link to={to} className={cx(styles.button, styles[variant], styles[size], styles.link, className)} data-story-target={storyTarget}>
      {icon}
      {children}
    </Link>
  )
}
