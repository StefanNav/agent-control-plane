import { useState } from 'react'
import { Button, Field, Modal, Notice, RadioCardGroup, Tabs, Textarea } from '../../design-system'
import type { Verb } from '../../data/types'
import { useDemo } from '../../store'
import { can, lockReason } from '../../store/permissions'
import { selectFixOneThing } from './selectors'
import styles from './controls.module.css'

export interface FixOneThingProps {
  agentId: string
  initialMode: 'shadow' | 'revoke'
  onClose: () => void
}

/** Fix one thing (6c): return one activity to Shadow, or revoke one tool; the rest keeps working. */
export function FixOneThing({ agentId, initialMode, onClose }: FixOneThingProps) {
  const state = useDemo((s) => s)
  const returnToShadow = useDemo((s) => s.returnToShadow)
  const revokeTool = useDemo((s) => s.revokeTool)
  const view = selectFixOneThing(state, state.personaId, agentId)
  const [mode, setMode] = useState(initialMode)
  const [activity, setActivity] = useState(view.activities.find((a) => !a.disabled)?.value ?? null)
  const [grant, setGrant] = useState(view.grants[0]?.value ?? null)
  const [reason, setReason] = useState('')
  const [refused, setRefused] = useState<string | null>(null)
  const chosen = mode === 'shadow' ? activity : grant
  const ready = Boolean(chosen) && reason.trim().length > 0
  const action = mode === 'shadow' ? 'returnToShadow' : 'revokeTool'
  const locked = can(state, state.personaId, action, { agentId }) ? undefined : lockReason(action, state.personaId)
  const rule = mode === 'shadow' && activity ? view.shadowRule(activity) : null
  const effects =
    mode === 'shadow'
      ? view.shadowEffects
      : view.revokeEffects(view.grants.find((g) => g.value === grant)?.title ?? 'the tool')

  const confirm = () => {
    if (!chosen) return
    let result
    if (mode === 'shadow') {
      result = returnToShadow(chosen, reason)
    } else {
      const [system = '', verb = 'read'] = chosen.split('|')
      result = revokeTool(agentId, { system, verb: verb as Verb }, reason)
    }
    if (result.ok) onClose()
    else setRefused(result.reason)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Fix one thing"
      description={view.description}
      audit={view.audit}
      width={620}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={ready ? 'primary' : 'blocked'} aria-disabled={!ready || Boolean(locked)} locked={locked} onClick={confirm}>
            {mode === 'shadow' ? 'Return to Shadow' : 'Revoke tool'}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <Tabs
          ariaLabel="Fix"
          current={mode}
          onSelect={(id) => setMode(id as 'shadow' | 'revoke')}
          items={[
            { id: 'revoke', label: 'Revoke a tool' },
            { id: 'shadow', label: 'Return to Shadow' },
          ]}
        />
        <div className={styles.section}>
          <span className={styles.label}>{mode === 'shadow' ? 'Activity' : 'Tool grant'}</span>
          {mode === 'shadow' ? (
            <RadioCardGroup
              name="fix-activity"
              aria-label="Activity"
              value={activity}
              onChange={setActivity}
              options={view.activities}
            />
          ) : (
            <RadioCardGroup
              name="fix-grant"
              aria-label="Tool grant"
              value={grant}
              onChange={setGrant}
              options={view.grants}
            />
          )}
        </div>
        <div className={styles.section}>
          <span className={styles.label}>What happens</span>
          <ul className={styles.lines}>
            {effects.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        {rule ? (
          <Notice mark="lock" lead={rule.lead}>
            {rule.text}
          </Notice>
        ) : null}
        {refused ? (
          <Notice mark="crit" lead="Not changed.">
            {refused}
          </Notice>
        ) : null}
        <Field label="Reason" htmlFor="fix-reason" hint="Required">
          <Textarea
            id="fix-reason"
            rows={2}
            className={styles.reason}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="What are you fixing, and why this way?"
          />
        </Field>
      </div>
    </Modal>
  )
}
