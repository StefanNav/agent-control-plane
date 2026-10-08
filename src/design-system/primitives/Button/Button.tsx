import { useId, type ComponentPropsWithRef, type MouseEvent, type ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import { Icon } from '../../icons/Icon'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'blocked'

export type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'type'> & {
  variant?: ButtonVariant
  /** `md` = page buttons (36 high, ghost 32); `sm` = in-card buttons (32 high, 13 px). */
  size?: 'md' | 'sm'
  icon?: ReactNode
  type?: 'button' | 'submit'
  /**
   * Why this person can't use it, e.g. "Read-only access". Renders the designed locked state
   * (blocked look, lock icon); it stays focusable and the reason is announced and shown on hover.
   */
  locked?: string
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  type = 'button',
  locked,
  className,
  onClick,
  children,
  ...rest
}: ButtonProps) {
  const reasonId = useId()
  const look = locked ? 'blocked' : variant
  const blocked = look === 'blocked'
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
      className={cx(styles.button, styles[look], styles[size], className)}
      aria-disabled={blocked || undefined}
      onClick={handleClick}
      {...(locked ? { title: locked, 'aria-describedby': reasonId } : {})}
      {...rest}
    >
      {locked ? <Icon name="lock" size={12} color="var(--cs-meta)" /> : icon}
      {children}
      {locked ? (
        <span id={reasonId} className={styles.srOnly} aria-hidden="true">
          {locked}
        </span>
      ) : null}
    </button>
  )
}
