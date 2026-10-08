import type { KeyboardEvent } from 'react'
import { Icon, RuleTag } from '../../design-system'
import type { ExceptionState, Status } from '../../data/types'
import { cx } from '../../lib/cx'
import { StatusChip } from '../StatusChip/StatusChip'
import styles from './ExceptionList.module.css'

/** One exception as the inbox shows it. Times and deadlines arrive formatted. */
export interface ExceptionView {
  id: string
  status: Status
  type: string
  reason: string
  agent: string
  ruleTag: string
  /** "09:42" */
  raised: string
  action: string
  actionSub: string
  owner: string
  /** "unclaimed", "claimed 09:44", "resolved by Marcus" */
  ownerSub: string
  /** "10:30", "Overdue 12 min", "Closed 10:21" */
  deadline: string
  /** "in 48 min", "escalated to Priya" */
  deadlineSub: string
  state: ExceptionState
  outcome?: string
  outcomeSub?: string
}

export interface ExceptionGroup {
  id: string
  label?: string
  count?: number
  items: ExceptionView[]
}

export interface ExceptionListProps {
  groups: ExceptionGroup[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  onOpen?: (id: string) => void
  /** Show the Type / Reason / Action needed / Owner / Deadline header. */
  showHeader?: boolean
  ariaLabel: string
}

const GRID = { gridTemplateColumns: '8px 176px minmax(0, 1fr) 236px 128px 148px' }

/** The inbox (component 03): every alert names an action, an owner and a deadline. */
export function ExceptionList({ groups, selectedId = null, onSelect, onOpen, showHeader = false, ariaLabel }: ExceptionListProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen?.(id)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const list = Array.from(event.currentTarget.closest('[role="table"]')?.querySelectorAll<HTMLElement>('[data-exception]') ?? [])
      list[list.indexOf(event.currentTarget) + (event.key === 'ArrowDown' ? 1 : -1)]?.focus()
    }
  }

  return (
    <div role="table" aria-label={ariaLabel} className={styles.list}>
      {showHeader ? (
        <div role="row" className={styles.head} style={GRID}>
          <span />
          {['Type', 'Reason', 'Action needed', 'Owner', 'Deadline'].map((label) => (
            <span key={label} role="columnheader">
              {label}
            </span>
          ))}
        </div>
      ) : null}
      {groups.map((group) => (
        <div key={group.id} role="rowgroup">
          {group.label ? (
            <div role="row" className={styles.group}>
              <span role="cell">{group.label}</span>
              {group.count !== undefined ? <span role="cell">{group.count}</span> : null}
            </div>
          ) : null}
          {group.items.map((item) => {
            const resolved = item.state === 'resolved' || item.state === 'dismissed'
            const overdue = item.state === 'overdue'
            return (
              <div
                key={item.id}
                role="row"
                tabIndex={0}
                data-exception={item.id}
                data-state={item.state}
                aria-selected={item.id === selectedId}
                className={cx(styles.item, item.id === selectedId && styles.selected)}
                style={GRID}
                onClick={() => onSelect?.(item.id)}
                onDoubleClick={() => onOpen?.(item.id)}
                onKeyDown={(event) => onKeyDown(event, item.id)}
              >
                <span role="cell">{item.state === 'new' ? <span data-dot className={styles.dot} /> : null}</span>
                <span role="cell" className={styles.typeCell}>
                  <StatusChip status={item.status} label={item.type} muted={resolved} />
                </span>
                <span role="cell" className={styles.stack}>
                  <span data-reason className={cx(styles.reason, item.state === 'new' && styles.strongReason, resolved && styles.mutedText)}>
                    {item.reason}
                  </span>
                  <span className={styles.meta}>
                    <span>{item.agent}</span>
                    <RuleTag>{item.ruleTag}</RuleTag>
                    <span className={styles.mono}>raised {item.raised}</span>
                  </span>
                </span>
                <span role="cell" className={styles.stack}>
                  <span className={cx(styles.action, resolved && styles.mutedText)}>{resolved ? item.outcome : item.action}</span>
                  <span className={styles.sub}>{resolved ? item.outcomeSub : item.actionSub}</span>
                </span>
                <span role="cell" className={styles.stack}>
                  <span className={styles.owner}>{item.owner}</span>
                  <span className={styles.sub}>{item.ownerSub}</span>
                </span>
                <span role="cell" className={styles.stack}>
                  <span className={styles.deadlineRow}>
                    {overdue ? <Icon name="triangle" color="var(--cs-crit)" /> : null}
                    <span className={cx(styles.deadline, overdue && styles.overdue, resolved && styles.mutedText)}>
                      {item.deadline}
                    </span>
                  </span>
                  {item.deadlineSub ? <span className={styles.sub}>{item.deadlineSub}</span> : null}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
