import type { ReactNode } from 'react'
import { Button, Field, Icon, Modal, Notice, RadioCardGroup, Textarea, type RadioCardOption } from '../../design-system'
import styles from './ImpactDialogs.module.css'

export interface PauseDialogProps<Scope extends string> {
  open: boolean
  agentName: string
  scopes: RadioCardOption<Scope>[]
  scope: Scope
  onScopeChange: (scope: Scope) => void
  /** What happens to queued work (6b), e.g. value "12", lead "drafts in progress go back to pharmacists". */
  effects: { value: string; lead: string; text: string }[]
  /** e.g. lead "Resuming needs Priya and you," */
  resumeRule: { lead: string; text: string }
  reason: string
  onReasonChange: (reason: string) => void
  /** "Logs Marcus · 09:47" */
  audit: string
  /** Why the store refused, shown above the reason. */
  error?: string | null
  /** The viewer may not pause here: the confirm button shows the designed locked state with this reason. */
  locked?: string
  onCancel: () => void
  onConfirm: () => void
}

/** Stop easy: scope first, the impact before anything stops (component 08). */
export function PauseDialog<Scope extends string>(props: PauseDialogProps<Scope>) {
  return (
    <Modal
      open={props.open}
      onClose={props.onCancel}
      title={`Pause ${props.agentName}?`}
      description="Takes effect at the gateway within seconds. Nothing is lost."
      audit={props.audit}
      width={620}
      actions={
        <>
          <Button variant="ghost" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button variant="primary" locked={props.locked} onClick={props.onConfirm}>
            Pause agent
          </Button>
        </>
      }
    >
      <Section label="Scope">
        <RadioCardGroup name="pause-scope" aria-label="Scope" value={props.scope} onChange={props.onScopeChange} options={props.scopes} />
      </Section>
      <Section label="What happens">
        <ul className={styles.effects}>
          {props.effects.map((effect) => (
            <li key={effect.lead} className={styles.effect}>
              <span className={styles.effectValue}>{effect.value}</span>
              <span className={styles.effectBody}>
                <span className={styles.effectLead}>{effect.lead}</span>
                <span className={styles.effectText}>{effect.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Notice mark="lock" lead={props.resumeRule.lead}>
        {props.resumeRule.text}
      </Notice>
      {props.error ? (
        <Notice mark="crit" lead="Not paused.">
          {props.error}
        </Notice>
      ) : null}
      <Field label="Reason" htmlFor="pause-reason" hint="Optional · goes on the incident record">
        <Textarea
          id="pause-reason"
          rows={2}
          className={styles.reasonShort}
          placeholder="Why are you pausing?"
          value={props.reason}
          onChange={(event) => props.onReasonChange(event.target.value)}
        />
      </Field>
    </Modal>
  )
}

export interface ResumeDialogProps {
  open: boolean
  /** `request`: owner asks; `approve`: sponsor co-signs. */
  mode: 'request' | 'approve'
  agentName: string
  pausedBy: string
  /** "09:47" */
  pausedAt: string
  /** "2 h 14 min ago" */
  pausedAgo: string
  needs: { name: string; status: string; done: boolean }[]
  returnsTo: { activity: string; level: string }[]
  reason: string
  onReasonChange: (reason: string) => void
  /** "Stays paused until Priya approves" */
  statusLine: string
  onCancel: () => void
  onSubmit: () => void
}

/** Resume deliberate: both people, each with a reason (component 08). */
export function ResumeDialog(props: ResumeDialogProps) {
  const ready = props.reason.trim().length > 0
  return (
    <Modal
      open={props.open}
      onClose={props.onCancel}
      title={props.mode === 'request' ? `Request to resume ${props.agentName}` : `Approve resuming ${props.agentName}`}
      description={
        <span className={styles.paused}>
          <Icon name="paused" color="var(--cs-icon)" />
          Paused by {props.pausedBy} at <span className={styles.mono}>{props.pausedAt}</span> · {props.pausedAgo}
        </span>
      }
      footNote={props.statusLine}
      actions={
        <>
          <Button onClick={props.onCancel}>Cancel</Button>
          <Button variant={ready ? 'primary' : 'blocked'} onClick={ready ? props.onSubmit : undefined}>
            {props.mode === 'request' ? 'Request resume' : 'Approve resume'}
          </Button>
        </>
      }
    >
      <Section label="Needs both">
        <ul className={styles.needs}>
          {props.needs.map((person) => (
            <li key={person.name} className={styles.need}>
              <span className={styles.who}>
                <span className={person.done ? styles.signed : styles.pending}>
                  {person.done ? <Icon name="check" size={11} color="var(--cs-raised)" /> : null}
                </span>
                <span className={styles.name}>{person.name}</span>
              </span>
              <span className={styles.status}>{person.status}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section label="Returns to">
        {props.returnsTo.map((item) => (
          <span key={item.activity} className={styles.returns}>
            <span>{item.activity}</span>
            <span className={styles.level}>{item.level}</span>
          </span>
        ))}
      </Section>
      <Field label="Reason" htmlFor="resume-reason" hint="Required">
        <Textarea id="resume-reason" value={props.reason} onChange={(event) => props.onReasonChange(event.target.value)} />
      </Field>
    </Modal>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.section}>
      <span className={styles.label}>{label}</span>
      {children}
    </div>
  )
}
