import type { ReactNode } from 'react'
import { Icon, RuleTag } from '../../design-system'
import type { GrantCell, Verb } from '../../data/types'
import { cx } from '../../lib/cx'
import styles from './SystemsVerbsGrid.module.css'

const VERBS: Verb[] = ['read', 'draft', 'write', 'submit', 'sign', 'order']
const LABELS: Record<Verb, string> = { read: 'Read', draft: 'Draft', write: 'Write', submit: 'Submit', sign: 'Sign', order: 'Order' }
const LOCKED_VERBS: Verb[] = ['sign', 'order']

export interface SystemsVerbsRow {
  system: string
  detail: string
  cells: Record<Verb, GrantCell>
}

export interface SystemsVerbsGridProps {
  rows: SystemsVerbsRow[]
  /** The organisation policy that locks Sign and Order, named once. */
  policyId: string
  /** Extra sentence after the policy line, e.g. what changed in this version. */
  note?: ReactNode
  /** Buttons in the footer (e.g. Back / Continue). */
  actions?: ReactNode
  /** Makes unlocked cells toggle buttons. */
  onToggle?: (system: string, verb: Verb) => void
  /** The row that needs attention (1c: a grant still missing its activity). */
  selected?: string
  /** Replaces the footer's lead-in before the policy tag (1c "Sign and order are locked for every agent by"). */
  policyText?: ReactNode
}

/** Which systems the agent may read, draft, write or submit to (component 07). */
export function SystemsVerbsGrid({ rows, policyId, note, actions, onToggle, selected, policyText }: SystemsVerbsGridProps) {
  return (
    <div className={styles.grid}>
      <div className={cx(styles.row, styles.head)}>
        <span>System</span>
        {VERBS.map((verb) => (
          <span key={verb} className={cx(styles.headCell, LOCKED_VERBS.includes(verb) && styles.lockedColumn, verb === 'sign' && styles.firstLocked)}>
            {LOCKED_VERBS.includes(verb) ? <Icon name="lock" color="var(--cs-meta)" /> : null}
            {LABELS[verb]}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.system} className={cx(styles.row, row.system === selected && styles.selected)} data-selected={row.system === selected ? 'true' : undefined}>
          <span className={styles.system}>
            <span className={styles.systemName}>{row.system}</span>
            <span className={styles.detail}>{row.detail}</span>
          </span>
          {VERBS.map((verb) => {
            const cell = row.cells[verb]
            const label = `${row.system} · ${verb}`
            return (
              <span
                key={verb}
                data-cell={cell}
                className={cx(styles.cell, cell === 'locked' && styles.lockedColumn, verb === 'sign' && styles.firstLocked)}
              >
                {cell === 'locked' ? (
                  <Icon name="lock" color="var(--cs-meta)" title={`${LABELS[verb]} locked by ${policyId}`} />
                ) : onToggle ? (
                  <button
                    type="button"
                    aria-label={label}
                    aria-pressed={cell !== 'none'}
                    className={styles.toggle}
                    onClick={() => onToggle(row.system, verb)}
                  >
                    <Mark cell={cell} />
                  </button>
                ) : (
                  <Mark cell={cell} />
                )}
              </span>
            )
          })}
        </div>
      ))}
      <div className={styles.foot}>
        <span className={styles.footText}>
          {policyText ?? 'Sign and order stay with people at every level, locked by'} <RuleTag>{policyId}</RuleTag>.{note ? <> {note}</> : null}
        </span>
        {actions ? <span className={styles.actions}>{actions}</span> : null}
      </div>
    </div>
  )
}

function Mark({ cell }: { cell: Exclude<GrantCell, 'locked'> }) {
  if (cell === 'none') return <span className={styles.none} />
  return (
    <span className={cx(styles.granted, cell === 'changed' && styles.changed)}>
      <Icon name="check" size={10} color="var(--cs-raised)" />
    </span>
  )
}
