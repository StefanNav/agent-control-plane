import { useState } from 'react'
import type { Role } from '../../data/types'
import { Button, Field, Input, Modal, Select } from '../../design-system'
import { useDemo } from '../../store'
import { personName } from '../../store/onboardingRules'
import { HOSPITAL_WIDE, ROLE_LABEL } from '../../store/settings'
import styles from './settings.module.css'

const ROLES: Role[] = ['programLead', 'committee', 'readOnly', 'sponsor', 'owner', 'techOwner', 'frontline']

/** 8b's "Invite", composed: a new person with one role in one division. */
export function InviteModal({ onClose }: { onClose: () => void }) {
  const state = useDemo((s) => s)
  const invitePerson = useDemo((s) => s.invitePerson)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [role, setRole] = useState<Role>('frontline')
  const [divisionId, setDivisionId] = useState(state.divisions.find((d) => d.id === 'medications')?.id ?? state.divisions[0]!.id)
  const [error, setError] = useState<string>()
  const wide = HOSPITAL_WIDE.includes(role)
  const send = () => {
    const result = invitePerson({ name, title, role, divisionId })
    if (!result.ok) return setError(result.reason)
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Invite"
      description="What they can do comes from the role you give them."
      footNote={error ? <span role="alert">{error}</span> : `Logged as ${personName(state, state.personaId)}`}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={send}>
            Send invite
          </Button>
        </>
      }
    >
      <div className={styles.modalForm}>
        <Field label="Name" htmlFor="invite-name">
          <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Title" htmlFor="invite-title">
          <Input id="invite-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className={styles.pair}>
          <Field label="Role" htmlFor="invite-role">
            <Select id="invite-role" value={role} onChange={setRole} options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
          </Field>
          <Field label="Division" htmlFor="invite-division">
            <Select
              id="invite-division"
              value={wide ? 'all' : divisionId}
              locked={wide}
              onChange={setDivisionId}
              options={wide ? [{ value: 'all', label: 'All divisions' }] : state.divisions.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
