import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import styles from './SidePanel.module.css'

export interface SidePanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The panel's heading (an h2). */
  title: ReactNode
  /** Meta lines under the title; pass several for several lines. */
  sub?: ReactNode | ReactNode[]
  /** Names the panel as a region (or complementary, with `as="aside"`). Leave out for a plain section. */
  label?: string
  /** A ruled block after the body: notes, what happens next, the send button. */
  foot?: ReactNode
  /** `aside` when the panel supports the page rather than being part of its task. */
  as?: 'section' | 'aside'
  children?: ReactNode
}

/**
 * The 340 px card beside a page's main column (design source: `side`, `sideHead`, `sBlock`).
 * Head 16/600 with 14 px meta lines, padding 16 20; the body is the caller's; blocks are ruled.
 */
export function SidePanel({
  title,
  sub,
  label,
  foot,
  as: Tag = 'section',
  className,
  children,
  ...rest
}: SidePanelProps) {
  const subs = sub === undefined || sub === null ? [] : Array.isArray(sub) ? sub : [sub]
  return (
    <Tag className={cx(styles.panel, className)} aria-label={label} {...rest}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {subs.filter(Boolean).map((line, i) => (
          <span key={i} className={styles.sub}>
            {line}
          </span>
        ))}
      </div>
      {children}
      {foot ? <SidePanelBlock>{foot}</SidePanelBlock> : null}
    </Tag>
  )
}

export interface SidePanelBlockProps {
  children: ReactNode
}

/** A ruled section of a side panel: 14 px notes in text2, bold lead-ins in ink, 10 between lines. */
export function SidePanelBlock({ children }: SidePanelBlockProps) {
  return <div className={styles.block}>{children}</div>
}
