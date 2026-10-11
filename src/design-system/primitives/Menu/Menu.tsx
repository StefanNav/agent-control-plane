import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { cx } from '../../../lib/cx'
import { Icon } from '../../icons/Icon'
import styles from './Menu.module.css'

export interface MenuItem {
  id: string
  label: ReactNode
  sub?: ReactNode
  onSelect?: () => void
  /** Not allowed for this person: lock icon, `off` text, does nothing. */
  locked?: boolean
  /** Current choice: selection tint and bar. */
  selected?: boolean
}

export interface MenuGroup {
  label?: string
  items: MenuItem[]
}

export interface MenuProps {
  trigger: (props: { open: boolean; toggle: () => void; ref: Ref<HTMLButtonElement> }) => ReactNode
  groups: MenuGroup[]
  align?: 'left' | 'right'
  /** Opens below the trigger, or above it (a bar at the foot of the window). Default below. */
  placement?: 'below' | 'above'
  /** Panel width in px. Default 280. */
  width?: number
}

export function Menu({ trigger, groups, align = 'left', placement = 'below', width = 280 }: MenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const items = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    items()[0]?.focus()
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const onKeyDown = (event: KeyboardEvent) => {
    const list = items()
    const index = list.indexOf(document.activeElement as HTMLElement)
    if (event.key === 'Escape') {
      // Stop here so a menu inside a modal closes only the menu.
      event.preventDefault()
      event.stopPropagation()
      close(true)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      list[(index + step + list.length) % list.length]?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  const choose = (item: MenuItem) => {
    if (item.locked) return
    item.onSelect?.()
    close(true)
  }

  return (
    <div ref={rootRef} className={styles.root}>
      {trigger({ open, toggle: () => setOpen((value) => !value), ref: triggerRef })}
      {open ? (
        <div
          ref={panelRef}
          role="menu"
          className={cx(styles.panel, align === 'right' && styles.right, placement === 'above' && styles.above)}
          style={{ width }}
          onKeyDown={onKeyDown}
        >
          {groups.map((group, g) => (
            <div key={g} role="group" aria-label={group.label} className={cx(g > 0 && styles.divided)}>
              {group.label ? <div className={styles.groupLabel}>{group.label}</div> : null}
              {group.items.map((item) => (
                <div
                  key={item.id}
                  role="menuitem"
                  tabIndex={-1}
                  aria-disabled={item.locked || undefined}
                  className={cx(styles.item, item.locked && styles.locked, item.selected && styles.selected)}
                  onClick={() => choose(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      choose(item)
                    }
                  }}
                >
                  <span className={styles.itemLabel}>
                    {item.label}
                    {item.locked ? <Icon name="lock" color="var(--cs-off)" /> : null}
                  </span>
                  {item.sub ? <span className={styles.sub}>{item.sub}</span> : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
