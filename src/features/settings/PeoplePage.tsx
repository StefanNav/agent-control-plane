import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Role } from '../../data/types'
import { Button, Icon, Select, Table } from '../../design-system'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { lockReason } from '../../store/permissions'
import { HOSPITAL_WIDE, type RoleInput } from '../../store/settings'
import { InviteModal } from './InviteModal'
import { selectPeople } from './selectors'
import styles from './settings.module.css'

/** 8b: what each person can do comes from their role in a division. */
export function PeoplePage() {
  const [params, setParams] = useSearchParams()
  const state = useDemo((s) => s)
  const selected = params.get('person')
  const [adding, setAdding] = useState<{ person: string | null; role: Role; divisionId: string } | null>(null)
  const [inviting, setInviting] = useState(false)
  const base = selectPeople(state, selected, null, state.personaId)
  const person = base.person
  // The form belongs to the person it was opened for; choosing someone else starts it again.
  const form = adding && adding.person === person?.id ? adding : null
  const preview: RoleInput | null = form && (form.divisionId || HOSPITAL_WIDE.includes(form.role)) ? { role: form.role, divisionId: form.divisionId || 'all' } : null
  const view = preview ? selectPeople(state, selected, preview, state.personaId) : base
  const locked = view.editable ? null : lockReason('manageDivisions', state.personaId)

  return (
    <>
      <PageHeader
        breadcrumb="Settings / People and roles"
        title="People and roles"
        status="What you can do comes from your role in a division"
        actions={locked ? <Button locked={locked}>Invite</Button> : <Button onClick={() => setInviting(true)}>Invite</Button>}
      />
      <div className={styles.peopleLayout}>
        <Table
          ariaLabel="People and roles"
          rows={view.rows}
          getRowId={(r) => r.id}
          selectedId={person?.id ?? null}
          onSelect={(id) => setParams({ person: id }, { replace: true })}
          minRowHeight={60}
          columns={[
            { id: 'person', header: 'Person', width: '180px', render: (r) => <span className={styles.personName}>{r.name}</span> },
            { id: 'role', header: 'Role', width: '200px', render: (r) => r.role },
            { id: 'division', header: 'Division', width: '180px', render: (r) => r.division },
            { id: 'can', header: 'Can', width: 'minmax(0, 1fr)', render: (r) => r.can },
          ]}
        />
        {person ? (
          <aside className={styles.panel} aria-label={person.name}>
            <div className={styles.panelHead}>
              <span className={styles.personName}>{person.name}</span>
              <span className={styles.personTitle}>{person.title}</span>
            </div>
            <div className={styles.panelSection}>
              <span className={styles.caps}>Roles</span>
              {person.roles.length ? (
                person.roles.map((r) => <RoleRow key={`${r.role}-${r.divisionId}`} personId={person.id} role={r} />)
              ) : (
                <span className={styles.personTitle}>No roles</span>
              )}
            </div>
            {view.editable ? (
              <AddRole
                key={person.id}
                name={person.name}
                options={view}
                value={form}
                onChange={(v) => setAdding({ person: person.id, ...v })}
                onDone={() => setAdding(null)}
                personId={person.id}
              />
            ) : null}
            {person.caps.length ? (
              <div className={styles.panelSection}>
                <span className={styles.caps}>{person.capsHead}</span>
                <ul className={styles.capList}>
                  {person.caps.map((c) => (
                    <li key={c.label} className={c.ok ? styles.capOk : styles.capLocked}>
                      <Icon name={c.ok ? 'check' : 'lock'} color={c.ok ? 'var(--cs-ink)' : 'var(--cs-meta)'} />
                      {c.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
      {inviting ? <InviteModal onClose={() => setInviting(false)} /> : null}
    </>
  )
}

/** One held role, with "since" and (for the program lead) a composed "Remove". */
function RoleRow({ personId, role }: { personId: string; role: { role: Role; divisionId: string; label: string; since: string; removable: boolean } }) {
  const removeRole = useDemo((s) => s.removeRole)
  const [error, setError] = useState<string>()
  return (
    <div className={styles.roleRow}>
      <span>{role.label}</span>
      <span className={styles.roleMeta}>{role.since}</span>
      {role.removable ? (
        <button
          type="button"
          className={styles.textButton}
          aria-label={`Remove ${role.label}`}
          onClick={() => {
            const result = removeRole(personId, { role: role.role, divisionId: role.divisionId })
            setError(result.ok ? undefined : result.reason)
          }}
        >
          Remove
        </button>
      ) : null}
      {error ? (
        <span role="alert" className={styles.roleError}>
          {error}
        </span>
      ) : null}
    </div>
  )
}

interface AddRoleProps {
  personId: string
  name: string
  options: ReturnType<typeof selectPeople>
  value: { role: Role; divisionId: string } | null
  onChange: (v: { role: Role; divisionId: string }) => void
  onDone: () => void
}

/** "Add a role": choose the role and the division; the list below previews what it allows. */
function AddRole({ personId, name, options, value, onChange, onDone }: AddRoleProps) {
  const addRole = useDemo((s) => s.addRole)
  const [error, setError] = useState<string>()
  const first = options.person?.roles[0]?.role ?? 'techOwner'
  const role = value?.role ?? first
  const wide = HOSPITAL_WIDE.includes(role)
  const divisionId = wide ? '' : (value?.divisionId ?? '')
  const add = () => {
    const result = addRole(personId, { role, divisionId: wide ? 'all' : divisionId })
    if (!result.ok) return setError(result.reason)
    setError(undefined)
    onDone()
  }
  return (
    <div className={styles.panelSection}>
      <span className={styles.addHead}>Add a role</span>
      <Select aria-label={`Role for ${name}`} value={role} options={options.roleOptions} onChange={(r) => onChange({ role: r, divisionId })} />
      <Select
        aria-label={`Division for ${name}`}
        value={divisionId}
        locked={wide}
        options={[{ value: '', label: wide ? 'All divisions' : 'Choose a division' }, ...(wide ? [] : options.divisionOptions)]}
        onChange={(d) => onChange({ role, divisionId: d })}
      />
      <span className={styles.inline}>
        {wide || divisionId ? (
          <Button variant="primary" onClick={add}>
            Add role
          </Button>
        ) : (
          <Button locked="Choose a division">Add role</Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            setError(undefined)
            onDone()
          }}
        >
          Cancel
        </Button>
      </span>
      {error ? (
        <span role="alert" className={styles.roleError}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
