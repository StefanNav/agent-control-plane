import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Optional line under the title. */
  description?: ReactNode
  children: ReactNode
  /** Mono audit stamp in the footer, e.g. "Logs Marcus · 09:47". */
  audit?: ReactNode
  /** Plain status line in the footer instead of an audit stamp, e.g. "Stays paused until Priya approves". */
  footNote?: ReactNode
  actions: ReactNode
  /** Default 600. */
  width?: number
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Regions that stay reachable while a dialog is open (the story panel): Tab runs dialog → companion → dialog. */
const COMPANION = '[data-modal-companion]'

/**
 * Centred dialog on a scrim. While open it owns the keyboard: Escape closes it,
 * Tab cycles inside it (and through any companion region), and focus that lands
 * anywhere else is pulled back in.
 * The scrim does not close it, so a half-typed reason is never lost by a stray click.
 */
export function Modal({ open, onClose, title, description, children, audit, footNote, actions, width = 600 }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const close = useEffectEvent(onClose)

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    const opener = document.activeElement as HTMLElement | null
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
    // Read at key time, so a companion that mounts after the dialog still counts.
    const companions = () => Array.from(document.querySelectorAll<HTMLElement>(COMPANION))
    const companionItems = () => companions().flatMap((c) => Array.from(c.querySelectorAll<HTMLElement>(FOCUSABLE)))
    const inCompanion = (node: Node | null) => node !== null && companions().some((c) => c.contains(node))
    ;(focusable()[0] ?? dialog).focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const active = document.activeElement as HTMLElement | null
      const extra = companionItems()
      const go = (target: HTMLElement) => {
        event.preventDefault()
        target.focus()
      }
      if (active !== null && extra.includes(active)) {
        if (event.shiftKey && active === extra[0]) go(last)
        else if (!event.shiftKey && active === extra[extra.length - 1]) go(first)
        return
      }
      const inside = active !== null && items.includes(active)
      if (event.shiftKey && (!inside || active === first)) {
        go(inside ? (extra[extra.length - 1] ?? last) : last)
      } else if (!event.shiftKey && (!inside || active === last)) {
        go(inside ? (extra[0] ?? first) : first)
      }
    }
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node
      if (!dialog.contains(target) && !inCompanion(target)) (focusable()[0] ?? dialog).focus()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
      document.body.style.overflow = previousOverflow
      opener?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className={styles.layer}>
      <div className={styles.scrim} data-scrim />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={styles.dialog}
        style={{ width }}
      >
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        <div className={styles.body}>{children}</div>
        <div className={styles.foot}>
          {footNote ? <span className={styles.footNote}>{footNote}</span> : <span className={styles.audit}>{audit}</span>}
          <span className={styles.actions}>{actions}</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
