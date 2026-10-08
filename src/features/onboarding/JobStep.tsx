import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { UNITS } from '../../data/seed/catalogue'
import type { JobDraft } from '../../data/types'
import { Button, Icon, Input, RuleTag, Select, Textarea } from '../../design-system'
import { cx } from '../../lib/cx'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import type { JobFieldId } from '../../store/onboardingRules'
import { can, lockReason } from '../../store/permissions'
import { SendToSponsor } from './SendToSponsor'
import { selectJobStep } from './selectors'
import { StepCard } from './StepCard'
import { StepSide } from './StepSide'
import styles from './onboarding.module.css'

const FIELD_COPY: Record<JobFieldId, { label: string; help: string; fromRequest?: boolean }> = {
  purpose: { label: 'Purpose', help: 'One or two sentences anyone in the hospital would understand.', fromRequest: true },
  activities: { label: 'Activities', help: 'Each activity earns its own privilege, so keep them separate.' },
  never: { label: 'Never', help: '' },
  actingFor: { label: 'Acting for', help: 'Whose work the drafts belong to, and where they land.' },
  escalation: { label: 'Escalation triggers', help: 'When should the agent stop and hand the case to a pharmacist? Add at least one.' },
  criteria: { label: 'Success criteria', help: 'Measured against pharmacist work during a 21-day shadow. Go-live is decided on these.' },
  domain: { label: 'Rollout domain', help: 'Where the agent may work. Expanding it later needs a new privilege.', fromRequest: true },
}

function Status({ done }: { done: boolean }) {
  return done ? (
    <span className={styles.status}>
      <Icon name="check" size={12} color="var(--cs-meta)" /> Done
    </span>
  ) : (
    <span className={cx(styles.status, styles.missing)}>
      <span className={styles.box} /> Missing
    </span>
  )
}

function Block({ id, done, request, help, children }: { id: JobFieldId; done: boolean; request?: string; help?: ReactNode; children: ReactNode }) {
  const copy = FIELD_COPY[id]
  return (
    <div id={`field-${id}`} className={styles.block}>
      <div className={styles.blockHead}>
        <h3 className={styles.blockLabel}>
          {copy.label}
          {copy.fromRequest && request ? <span className={styles.tag}>from {request}</span> : null}
        </h3>
        <Status done={done} />
      </div>
      <span className={styles.help}>{help ?? copy.help}</span>
      {children}
    </div>
  )
}

/** "Add" behind a ghost button: one input, Enter or Add saves (1b "+ Add activity", "+ Add unit"). */
function AddInline({ label, placeholder, onAdd, disabled }: { label: string; placeholder: string; onAdd: (text: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const id = useId()
  if (disabled) return null
  if (!open)
    return (
      <span>
        <Button variant="ghost" onClick={() => setOpen(true)}>
          {label}
        </Button>
      </span>
    )
  const add = () => {
    if (text.trim()) onAdd(text.trim())
    setText('')
    setOpen(false)
  }
  return (
    <div className={styles.inline}>
      <Input
        id={id}
        aria-label={placeholder}
        placeholder={placeholder}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') add()
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      <Button variant="primary" onClick={add}>
        Add
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  )
}

const pct = (n: number | null) => (n === null ? '' : `${n.toFixed(1)} %`)

/** Step 2: what the agent is for and what it must never do (1b). */
export function JobStep({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const updateJob = useDemo((s) => s.updateJob)
  const [params] = useSearchParams()
  const view = useMemo(() => selectJobStep(state, agentId, state.personaId), [state, agentId])
  // Inputs show the saved value unless someone is typing in them (so a scenario load or another save shows through).
  const [editing, setEditing] = useState<{ field: string; text: string } | null>(null)
  const [trigger, setTrigger] = useState('')
  const [addingUnit, setAddingUnit] = useState(false)
  const ids = { purpose: useId(), actingFor: useId(), escalation: useId() }
  const fieldParam = params.get('field') as JobFieldId | null
  const focusField = fieldParam ?? (view?.welcome ? view.first : null)

  useEffect(() => {
    if (!focusField) return
    const block = document.getElementById(`field-${focusField}`)
    block?.scrollIntoView({ block: 'center' })
    block?.querySelector<HTMLElement>('input, textarea, select')?.focus()
  }, [focusField])

  if (!view) return null
  const editable = !view.frozen && can(state, state.personaId, 'editJobDescription', { agentId })
  const save = (patch: Partial<JobDraft>) => updateJob(agentId, patch)
  const { job } = view
  const fieldDone = (id: JobFieldId) => view.fields.find((f) => f.id === id)!.done
  const addTrigger = (text: string) => {
    if (!text.trim()) return
    save({ escalation: [...job.escalation, text] })
    setTrigger('')
  }
  const fieldLink = (field: JobFieldId) => `?field=${field}`
  const readOnlyReason = view.frozen ? 'Frozen at v1.0 · with AIMS Review' : lockReason('editJobDescription', state.personaId)

  return (
    <Split
      main={
        <StepCard number="02" title="Job description" sub={`What ${view.agentName} is for and what it must never do. The committee and every pharmacist will read this.`} meta={`${view.owner} · ${view.done} of 7`}>
          {view.welcome ? (
            <div className={styles.welcome} role="status">
              <span className={styles.welcomeText}>
                <strong>{view.welcome.title}</strong>
                {view.welcome.text}
              </span>
              <span className={styles.monoMeta}>{view.welcome.saved}</span>
            </div>
          ) : null}
          {!editable ? <span className={styles.note}>Read only: {readOnlyReason}.</span> : null}
          <div className={styles.fields}>
            <Block id="purpose" done={fieldDone('purpose')} request={view.requestCode}>
              {editable ? (
                <Textarea
                  id={ids.purpose}
                  aria-label="Purpose"
                  rows={2}
                  value={editing?.field === 'purpose' ? editing.text : job.purpose}
                  onChange={(e) => setEditing({ field: 'purpose', text: e.target.value })}
                  onBlur={() => {
                    if (editing?.field === 'purpose' && editing.text !== job.purpose) save({ purpose: editing.text })
                    setEditing(null)
                  }}
                />
              ) : (
                <span className={styles.listName}>{job.purpose}</span>
              )}
            </Block>

            <Block id="activities" done={fieldDone('activities')}>
              {job.activities.length ? (
                <div className={styles.list}>
                  {job.activities.map((a) => (
                    <div key={a.id} className={styles.listRow}>
                      <span className={styles.listMain}>
                        <span className={styles.listName}>{a.name}</span>
                        <span className={styles.listSub}>{a.branch}</span>
                      </span>
                      <span className={styles.listRight}>Starts in Shadow</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <AddInline
                label="+ Add activity"
                placeholder="What the activity does, e.g. Flag allergy conflicts"
                disabled={!editable}
                onAdd={(name) => save({ activities: [...job.activities, { id: `${agentId}-a${job.activities.length + 1}`, name, branch: 'No adverse branch noted yet' }] })}
              />
            </Block>

            <Block id="never" done={fieldDone('never')} help={`What the agent must never do, in plain words. ${view.tech} turns these into enforced hard stops in step 4.`}>
              <div className={styles.list}>
                {view.never.map((n) => (
                  <div key={n.text} className={styles.listRow}>
                    <span className={styles.listMain}>
                      <span className={styles.listName}>{n.text}</span>
                    </span>
                    {n.locked ? (
                      <span className={styles.listRightMeta}>
                        <Icon name="lock" color="var(--cs-meta)" /> already locked by <RuleTag>{n.becomes}</RuleTag>
                      </span>
                    ) : (
                      <span className={styles.listRightMeta}>
                        {n.plain ? 'becomes a plain-language hard stop' : 'becomes'} <RuleTag>{n.becomes}</RuleTag>
                        {editable ? (
                          <Button variant="ghost" aria-label={`Remove ${n.text}`} onClick={() => save({ never: job.never.filter((t) => t !== n.text) })}>
                            Remove
                          </Button>
                        ) : null}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <AddInline label="+ Add a never item" placeholder="In plain words, e.g. Change a dose" disabled={!editable} onAdd={(text) => save({ never: [...job.never, text] })} />
            </Block>

            <Block id="actingFor" done={fieldDone('actingFor')}>
              {editable ? (
                <Select
                  id={ids.actingFor}
                  aria-label="Acting for"
                  value={job.actingFor ?? ''}
                  onChange={(value) => save({ actingFor: value || null })}
                  options={[{ value: '', label: 'Choose whose work it is' }, ...view.actingForOptions.map((o) => ({ value: o, label: o }))]}
                />
              ) : (
                <span className={styles.listName}>{job.actingFor ?? '—'}</span>
              )}
              {view.actingForNote && job.actingFor ? <span className={styles.help}>{view.actingForNote}</span> : null}
            </Block>

            <Block id="escalation" done={fieldDone('escalation')}>
              {job.escalation.length ? (
                <div className={styles.list}>
                  {job.escalation.map((t) => (
                    <div key={t} className={styles.listRow}>
                      <span className={styles.listMain}>
                        <span className={styles.listName}>{t}</span>
                      </span>
                      {editable ? (
                        <Button variant="ghost" aria-label={`Remove ${t}`} onClick={() => save({ escalation: job.escalation.filter((e) => e !== t) })}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {editable ? (
                <>
                  <Input
                    id={ids.escalation}
                    aria-label="Escalation trigger"
                    placeholder="e.g. Home list and fill history disagree on a medication"
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTrigger(trigger)}
                    onBlur={() => addTrigger(trigger)}
                  />
                  {view.suggestions.length ? (
                    <div className={styles.chips}>
                      <span className={styles.help}>{view.suggestionsLabel}</span>
                      {view.suggestions.map((t) => (
                        <button key={t} type="button" className={styles.suggestion} onClick={() => addTrigger(t)}>
                          + {t}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </Block>

            <Block id="criteria" done={fieldDone('criteria')}>
              <div className={styles.list}>
                <div className={styles.criteriaHead}>
                  <span>Criterion</span>
                  <span />
                  <span>Target</span>
                  <span />
                </div>
                {view.criteria.map((c) => (
                  <div key={c.id} className={styles.criteriaRow}>
                    <span>{c.label}</span>
                    <span className={styles.direction}>{c.direction === 'atLeast' ? 'at least' : 'at most'}</span>
                    {editable ? (
                      <Input
                        className={styles.target}
                        aria-label={`${c.label} target, %`}
                        inputMode="decimal"
                        placeholder="— %"
                        value={editing?.field === c.id ? editing.text : pct(c.target)}
                        onChange={(e) => setEditing({ field: c.id, text: e.target.value })}
                        onBlur={() => {
                          if (editing?.field !== c.id) return
                          const raw = editing.text.replace('%', '').trim()
                          const value = raw === '' ? null : Number(raw)
                          setEditing(null)
                          if (value !== null && Number.isNaN(value)) return
                          if (value !== c.target) save({ targets: { [c.id]: value } })
                        }}
                      />
                    ) : (
                      <span>{c.target === null ? '— %' : `${c.target.toFixed(1)} %`}</span>
                    )}
                    {c.target === null ? (
                      <span className={cx(styles.status, styles.missing)}>
                        <span className={styles.box} /> Needs a number
                      </span>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
            </Block>

            <Block id="domain" done={fieldDone('domain')} request={view.requestCode}>
              <div className={styles.domain}>
                <span>Units</span>
                <span className={styles.chips}>
                  {job.domain.units.map((u) => (
                    <span key={u} className={styles.chip}>
                      {u}
                    </span>
                  ))}
                  {editable && addingUnit ? (
                    <Select
                      aria-label="Add unit"
                      value=""
                      onChange={(unit) => {
                        if (unit) save({ domain: { ...job.domain, units: [...job.domain.units, unit] } })
                        setAddingUnit(false)
                      }}
                      options={[{ value: '', label: 'Choose a unit' }, ...UNITS.filter((u) => !job.domain.units.includes(u)).map((u) => ({ value: u, label: u }))]}
                    />
                  ) : editable ? (
                    <Button variant="ghost" onClick={() => setAddingUnit(true)}>
                      + Add unit
                    </Button>
                  ) : null}
                </span>
                <span>Patients</span>
                <span className={styles.chips}>
                  <span className={styles.chip}>{job.domain.patients}</span>
                </span>
                <span>Hours</span>
                <span className={styles.chips}>
                  <span className={styles.chip}>{job.domain.hours}</span>
                </span>
              </div>
            </Block>
          </div>
        </StepCard>
      }
      side={
        <StepSide
          title={`Job description · ${view.done} of 7`}
          sub={`${view.items.done} of ${view.items.total} items done across the record`}
          progress={view.items.done / view.items.total}
          rows={view.fields.map((f) => ({ key: f.id, label: f.label, done: f.done, current: !f.done && f.id === (fieldParam ?? view.first), to: fieldLink(f.id) }))}
          also={view.alsoNeeded}
          alsoLabel={`Also needed before ${view.sponsor}`}
          foot={
            <>
              <SendToSponsor agentId={agentId} />
              {view.blocked.left > 0 ? (
                <span>
                  <strong>Blocked: {view.blocked.left} items left.</strong>{' '}
                  {view.blocked.next.length ? (
                    <>
                      Next for {state.personaId === state.agents.find((a) => a.id === agentId)?.ownerId ? 'you' : view.owner}:{' '}
                      {view.blocked.next.map((n, i) => (
                        <span key={n.label}>
                          {i ? ', ' : ''}
                          <Link to={fieldLink(n.field)} replace className={styles.textLink}>
                            {n.label}
                          </Link>
                        </span>
                      ))}
                      .
                    </>
                  ) : null}
                </span>
              ) : null}
            </>
          }
        />
      }
    />
  )
}
