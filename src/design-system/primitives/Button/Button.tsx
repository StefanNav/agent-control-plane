import type { ComponentPropsWithRef, MouseEvent, ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'blocked'

export type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'type'> & {
  variant?: ButtonVariant
  /** `md` = page buttons (36 high, ghost 32); `sm` = in-card buttons (32 high, 13 px). */
  size?: 'md' | 'sm'
  icon?: ReactNode
  type?: 'button' | 'submit'
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  type = 'button',
  className,
  onClick,
  children,
  ...rest
}: ButtonProps) {
  const blocked = variant === 'blocked'
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (blocked) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], styles[size], className)}
      aria-disabled={blocked || undefined}
      onClick={handleClick}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
