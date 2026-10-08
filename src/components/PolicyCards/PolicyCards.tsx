import type { ReactNode } from 'react'
import { Button, Icon } from '../../design-system'
import styles from './PolicyCards.module.css'

interface Row {
  key: string
  value: ReactNode
}

export interface HardStopCardProps {
  /** "HS-04 v2" */
  code: string
  title: string
  description: string
  rows: Row[]
  footer?: ReactNode
  /** Extra content under the facts, e.g. its test on the last 30 days (1d). */
  children?: ReactNode
}

/** An enforced rule: solid ink border, filled, locked (component 06). */
export function HardStopCard({ code, title, description, rows, footer, children }: HardStopCardProps) {
  return (
    <div className={styles.hardStop}>
      <div className={styles.bar}>
        <span className={styles.barLabel}>
          <Icon name="lock" color="var(--cs-raised)" />
          Hard stop · enforced at the gateway
        </span>
        <span className={styles.barCode}>{code}</span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        <Facts rows={rows} />
        {children}
      </div>
      {footer ? (
        <div className={styles.footer}>
          <Icon name="lock" color="var(--cs-text2)" />
          {footer}
        </div>
      ) : null}
    </div>
  )
}

export interface InstructionCardProps {
  text: string
  rows: Row[]
  onEdit?: () => void
}

/** Advisory text in the prompt: open, rounded, editable, never dashed (component 06). */
export function InstructionCard({ text, rows, onEdit }: InstructionCardProps) {
  return (
    <div className={styles.instruction}>
      <div className={styles.instructionHead}>
        <span className={styles.instructionLabel}>Instruction · in the agent's prompt</span>
        {onEdit ? (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
        ) : null}
      </div>
      <div className={styles.well}>{text}</div>
      {rows.length ? (
        <div className={styles.instructionFacts}>
          <Facts rows={rows} />
        </div>
      ) : null}
      <p className={styles.guidance}>Guidance only: the model may not follow it, so nothing safety-critical lives here.</p>
    </div>
  )
}

function Facts({ rows }: { rows: Row[] }) {
  if (!rows.length) return null
  return (
    <dl className={styles.facts}>
      {rows.map((row) => (
        <div key={row.key} className={styles.fact}>
          <dt>{row.key}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
