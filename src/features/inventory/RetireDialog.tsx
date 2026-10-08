import { useState } from 'react'
import { Button, Field, Input, Modal, Notice, RadioCardGroup, Textarea } from '../../design-system'
import { useDemo } from '../../store'
import { can, lockReason } from '../../store/permissions'
import { personName } from '../board/selectors'
import { roleOn } from '../controls/selectors'
import { selectRetirePreview } from './selectors'
import styles from '../controls/controls.module.css'

export interface RetireDialogProps {
  agentId: string
  initialMode: 'disable' | 'retire'
  onClose: () => void
}

/** Disable or retire (6f): disable is reversible; retiring is permanent and needs the agent's exact name. */
export function RetireDialog({ agentId, initialMode, onClose }: RetireDialogProps) {
  const state = useDemo((s) => s)
  const disableAgent = useDemo((s) => s.disableAgent)
  const retireAgent = useDemo((s) => s.retireAgent)
  const agent = state.agents.find((a) => a.id === agentId)!
  const preview = selectRetirePreview(state, agentId)
  const [mode, setMode] = useState(initialMode)
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const [refused, setRefused] = useState<string | null>(null)
  const nameMatches = typed.trim() === agent.name
  const ready = reason.trim().length > 0 && (mode === 'disable' || nameMatches)
  const locked = can(state, state.personaId, mode, { agentId }) ? undefined : lockReason(mode, state.personaId)
  const confirm = () => {
    const result =
      mode === 'retire'
        ? retireAgent(agentId, { typedName: typed, reason })
        : disableAgent(agentId, reason)
    if (result.ok) onClose()
    else setRefused(result.reason)
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={`Disable or retire ${agent.name}`}
      description="Disabling revokes access and keeps the record live. Retiring can’t be undone: the record is archived and leaves every board."
      audit={`Logs ${personName(state, state.personaId)} · ${roleOn(state, state.personaId, agentId)}`}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={ready ? 'primary' : 'blocked'} aria-disabled={!ready || Boolean(locked)} locked={locked} onClick={confirm}>
            {mode === 'retire' ? 'Retire agent' : 'Disable agent'}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <RadioCardGroup
          name="retire-mode"
          aria-label="Disable or retire"
          value={mode}
          onChange={setMode}
          options={[
            {
              value: 'disable',
              title: 'Disable',
              description: 'Access revoked now. The record stays live; restoring access goes back through tool approval.',
            },
            {
              value: 'retire',
              title: 'Retire for good',
              description: 'Access revoked, privileges closed, record archived. Can’t be undone.',
            },
          ]}
        />
        <div className={styles.section}>
          <span className={styles.label}>
            {mode === 'retire' ? 'Retiring does this' : 'Disabling does this'}
          </span>
          <ul className={styles.lines}>
            {(mode === 'retire' ? preview.lines : preview.disableLines).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        {mode === 'retire' ? (
          <Field label="Type the agent’s name to confirm" htmlFor="retire-name">
            <Input
              id="retire-name"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={agent.name}
              autoComplete="off"
            />
          </Field>
        ) : null}
        {refused ? (
          <Notice mark="crit" lead="Not done.">
            {refused}
          </Notice>
        ) : null}
        <Field label="Reason" htmlFor="retire-reason" hint="Required">
          <Textarea
            id="retire-reason"
            rows={2}
            className={styles.reason}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}
