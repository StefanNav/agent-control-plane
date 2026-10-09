import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Checkbox, Field, Input, Modal, Select } from '../../design-system'
import { useDemo } from '../../store'
import { personName } from '../../store/onboardingRules'
import { divisionSlug } from '../../store/settings'
import { selectNewDivision } from './selectors'
import styles from './settings.module.css'

/**
 * "New division" and "Split this division" (8a draws the buttons, not the form; R6): name it, say who
 * answers for it, and for a split tick the agents that move, watching both owners' spans.
 */
export function NewDivisionModal({ from, onClose }: { from: string | null; onClose: () => void }) {
  const state = useDemo((s) => s)
  const createDivision = useDemo((s) => s.createDivision)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [sponsorId, setSponsorId] = useState(state.divisions.find((d) => d.id === from)?.sponsorId ?? '')
  const [agentIds, setAgentIds] = useState<string[]>([])
  const [error, setError] = useState<string>()
  const view = selectNewDivision(state, from, { ownerId, agentIds })
  const toggle = (id: string, on: boolean) => setAgentIds((ids) => (on ? [...ids, id] : ids.filter((x) => x !== id)))
  const create = () => {
    const result = createDivision({ name, ownerId, sponsorId, agentIds }, from ?? undefined)
    if (!result.ok) return setError(result.reason)
    onClose()
    navigate(`/settings/divisions/${divisionSlug(name)}`)
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={view.title}
      description={from ? 'The agents you tick move with their open items. Their technical owners keep access.' : 'An empty division. Move agents into it with a split.'}
      width={640}
      footNote={error ? <span role="alert">{error}</span> : (view.line ?? `Logged as ${personName(state, state.personaId)} · the sponsor is told`)}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={create}>
            {view.button}
          </Button>
        </>
      }
    >
      <div className={styles.modalForm}>
        <Field label="Name" htmlFor="division-name">
          <Input id="division-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className={styles.pair}>
          <Field label="Division owner" htmlFor="new-owner" hint="Supervises daily">
            <Select id="new-owner" value={ownerId} onChange={setOwnerId} options={[{ value: '', label: 'Choose an owner' }, ...view.ownerOptions]} />
          </Field>
          <Field label="Clinical sponsor" htmlFor="new-sponsor" hint="Signs privileges">
            <Select id="new-sponsor" value={sponsorId} onChange={setSponsorId} options={[{ value: '', label: 'Choose a sponsor' }, ...view.sponsorOptions]} />
          </Field>
        </div>
        {from ? (
          <fieldset className={styles.agentPicker}>
            <legend className={styles.listHead}>Agents to move</legend>
            {view.agents.map((a) => (
              <Checkbox key={a.id} checked={a.checked} onChange={(on) => toggle(a.id, on)} label={a.name} description={`${a.activities} ${a.activities === 1 ? 'activity' : 'activities'}`} />
            ))}
          </fieldset>
        ) : null}
      </div>
    </Modal>
  )
}
