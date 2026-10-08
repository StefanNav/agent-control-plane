import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import type { LapsePolicy } from '../../data/types'
import { Button, Field, LinkButton, Notice, RadioCardGroup, Select, Table, Tabs } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { lockReason } from '../../store/permissions'
import type { DivisionPatch } from '../../store/settings'
import { GRACE_OPTIONS, LAPSE_OPTIONS, selectDivisionAgents, selectDivisionSettings } from './selectors'
import styles from './settings.module.css'

/** 8a: Dana decides who answers for a division and what happens when a review date passes. */
export function DivisionSettingsPage() {
  const { divisionId = '' } = useParams()
  // A new division starts from a clean draft.
  return <DivisionSettings key={divisionId} divisionId={divisionId} />
}

function DivisionSettings({ divisionId }: { divisionId: string }) {
  const [params] = useSearchParams()
  const state = useDemo((s) => s)
  const update = useDemo((s) => s.updateDivisionSettings)
  const [draft, setDraft] = useState<DivisionPatch>({})
  const [error, setError] = useState<string>()
  const view = selectDivisionSettings(state, divisionId, draft, state.personaId)
  if (!view) return <NotFound />
  const tab = params.get('tab') === 'agents' ? 'agents' : 'settings'
  const change = (patch: DivisionPatch) => {
    setError(undefined)
    setDraft((d) => ({ ...d, ...patch }))
  }
  const save = () => {
    const result = update(divisionId, draft)
    if (result.ok) setDraft({})
    else setError(result.reason)
  }
  const locked = view.editable ? null : lockReason('manageDivisions', state.personaId)

  return (
    <>
      <PageHeader
        breadcrumb={view.breadcrumb}
        title={view.title}
        status={view.sub}
        tabs={<Tabs ariaLabel="Division settings" current={tab} items={view.tabs} />}
      />
      {tab === 'agents' ? (
        <div className={styles.body}>
          <AgentsTab divisionId={divisionId} />
        </div>
      ) : (
        <div className={styles.layout}>
          <nav aria-label="Divisions" className={styles.divisions}>
            <span className={styles.listHead}>{view.divisions.head}</span>
            {view.divisions.rows.map((d) => (
              <Link key={d.id} to={`/settings/divisions/${d.id}`} className={d.current ? styles.divisionCurrent : styles.division} aria-current={d.current ? 'page' : undefined}>
                <span className={styles.divisionName}>{d.name}</span>
                <span className={styles.divisionSub}>{d.sub}</span>
              </Link>
            ))}
          </nav>

          <section className={styles.card} aria-label={`${view.title} settings`}>
            <div className={styles.section}>
              <h2 className={styles.heading}>Who answers for this division</h2>
              <div className={styles.pair}>
                <Field label="Division owner" htmlFor="division-owner" hint="Supervises daily">
                  {view.editable ? (
                    <Select id="division-owner" value={view.owner.value} options={view.owner.options} onChange={(v) => change({ ownerId: v })} />
                  ) : (
                    <span className={styles.value}>{view.owner.name}</span>
                  )}
                </Field>
                <Field label="Clinical sponsor" htmlFor="division-sponsor" hint="Signs privileges">
                  {view.editable ? (
                    <Select id="division-sponsor" value={view.sponsor.value} options={view.sponsor.options} onChange={(v) => change({ sponsorId: v })} />
                  ) : (
                    <span className={styles.value}>{view.sponsor.name}</span>
                  )}
                </Field>
              </div>
              {view.span ? (
                <Notice
                  mark="warn"
                  lead={view.span.lead}
                  actions={view.editable ? <LinkButton to={`/settings/divisions/${divisionId}?split=1`} variant="ghost">Split this division</LinkButton> : null}
                >
                  {view.span.text}
                </Notice>
              ) : null}
            </div>

            <div className={styles.section}>
              <div className={styles.headingBlock}>
                <h2 className={styles.heading}>When a privilege’s review date passes</h2>
                <p className={styles.lede}>Applies to every privilege in {view.title}. Changes are logged and the sponsor is told.</p>
              </div>
              {view.editable ? (
                <RadioCardGroup<LapsePolicy>
                  name="lapse"
                  aria-label="When a privilege’s review date passes"
                  value={view.lapse.value}
                  onChange={(v) => change({ lapsePolicy: v })}
                  options={LAPSE_OPTIONS}
                />
              ) : (
                <span className={styles.value}>{view.lapse.label}</span>
              )}
              <div className={styles.grace}>
                {view.lapse.value === 'shadow' ? (
                  <Field label="Grace period" htmlFor="grace">
                    {view.editable ? (
                      <Select id="grace" className={styles.graceSelect} value={String(view.lapse.graceDays)} options={GRACE_OPTIONS} onChange={(v) => change({ graceDays: Number(v) })} />
                    ) : (
                      <span className={styles.value}>{view.lapse.graceDays} days</span>
                    )}
                  </Field>
                ) : null}
                <p className={styles.preview}>{view.lapse.preview}</p>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.heading}>Unanswered exceptions</h2>
              <div className={styles.pair}>
                <Field label="Escalate to" htmlFor="escalate-first" hint="After the deadline">
                  {view.editable ? (
                    <Select
                      id="escalate-first"
                      value={view.escalation.first}
                      options={view.escalation.firstOptions}
                      onChange={(v) => change({ escalation: { first: v, then: view.escalation.then, afterHours: state.divisions.find((d) => d.id === divisionId)!.escalation.afterHours } })}
                    />
                  ) : (
                    <span className={styles.value}>{view.escalation.firstLabel}</span>
                  )}
                </Field>
                <Field label="Then to" htmlFor="escalate-then" hint={view.escalation.thenHelp}>
                  {view.editable ? (
                    <Select
                      id="escalate-then"
                      value={view.escalation.then}
                      options={view.escalation.thenOptions}
                      onChange={(v) => change({ escalation: { first: view.escalation.first, then: v, afterHours: state.divisions.find((d) => d.id === divisionId)!.escalation.afterHours } })}
                    />
                  ) : (
                    <span className={styles.value}>{view.escalation.thenLabel}</span>
                  )}
                </Field>
              </div>
            </div>

            <div className={styles.foot}>
              {locked ? (
                <Button locked={locked}>Save changes</Button>
              ) : view.footer.changes ? (
                <Button variant="primary" onClick={save}>
                  Save changes
                </Button>
              ) : (
                <Button locked="Nothing to save">Save changes</Button>
              )}
              <span className={styles.meta} role={error ? 'alert' : undefined}>
                {error ?? view.footer.line}
              </span>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

/** 8a's "Agents" tab, composed: the division's agents, read only, each linking to its record. */
function AgentsTab({ divisionId }: { divisionId: string }) {
  const state = useDemo((s) => s)
  const rows = selectDivisionAgents(state, divisionId)
  return (
    <Table
      ariaLabel="Agents in this division"
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { id: 'name', header: 'Agent', width: 'minmax(0, 1.4fr)', render: (r) => <Link to={`/inventory/agents/${r.id}`}>{r.name}</Link> },
        { id: 'level', header: 'Level', width: '120px', render: (r) => r.level },
        { id: 'owner', header: 'Owner', width: '140px', render: (r) => r.owner },
        { id: 'tech', header: 'Technical owner', width: '160px', render: (r) => r.techOwner },
        { id: 'tier', header: 'Tier', width: '160px', render: (r) => r.tier },
      ]}
    />
  )
}
