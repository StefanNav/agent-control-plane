import { useMemo } from 'react'
import { SystemsVerbsGrid } from '../../components'
import { RuleTag, Select } from '../../design-system'
import { cx } from '../../lib/cx'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import { can, lockReason } from '../../store/permissions'
import { SendToSponsor } from './SendToSponsor'
import { selectSystemsStep } from './selectors'
import { StepCard } from './StepCard'
import { StepSide } from './StepSide'
import styles from './onboarding.module.css'

/** Step 3: grant only what an activity needs; every grant names the activity it serves (1c). */
export function SystemsStep({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const updateSystems = useDemo((s) => s.updateSystems)
  const view = useMemo(() => selectSystemsStep(state, agentId), [state, agentId])
  if (!view) return null
  const editable = !view.frozen && can(state, state.personaId, 'editJobDescription', { agentId })
  const isOwner = state.agents.find((a) => a.id === agentId)?.ownerId === state.personaId
  const reason = view.frozen ? 'Frozen at v1.0 · with AIMS Review' : lockReason('editJobDescription', state.personaId)
  return (
    <Split
      main={
        <StepCard number="03" title="Systems and verbs" sub="Everything starts read only. Grant only what an activity needs; every grant names the activity it serves." meta={view.meta}>
          {!editable ? <span className={styles.note}>Read only: {reason}.</span> : null}
          <SystemsVerbsGrid
            rows={view.rows}
            policyId="ORG-POL-02"
            policyText="Sign and order are locked for every agent by"
            selected={view.selected}
            onToggle={editable ? (system, verb) => updateSystems(agentId, { kind: 'grant', system, verb, on: view.rows.find((r) => r.system === system)!.cells[verb] === 'none' }) : undefined}
          />
          <section className={styles.section}>
            <h3 className={styles.caps}>Why each grant</h3>
            {view.why.length ? (
              <div className={styles.list}>
                {view.why.map((w) => (
                  <div key={w.key} className={cx(styles.listRow, styles.whyRow, w.isNew && styles.rowAttention)}>
                    <span className={styles.whyLabel}>
                      {w.label}
                      {w.isNew ? <RuleTag>new</RuleTag> : null}
                    </span>
                    {w.isNew && editable ? (
                      <Select
                        aria-label={`${w.label}: the activity it serves`}
                        className={styles.whySelect}
                        value=""
                        onChange={(activity) => activity && updateSystems(agentId, { kind: 'reason', system: w.system, verb: w.verb, activity })}
                        options={[{ value: '', label: 'Choose the activity it serves' }, ...view.purposes]}
                      />
                    ) : (
                      <span className={styles.listName}>{w.why || '—'}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className={styles.note}>Nothing granted yet. Tick a cell above to grant a verb.</span>
            )}
          </section>
          <div className={styles.reach}>
            <h3 className={styles.caps}>Reach in one line</h3>
            <strong>{view.reach.does || 'Reaches nothing yet.'}</strong>
            <span>{view.reach.never} This is the line {view.sponsor} and the committee read.</span>
          </div>
        </StepCard>
      }
      side={
        <StepSide
          title={view.progress.complete ? 'Systems and verbs · done' : `Systems and verbs · ${view.progress.done} of ${view.progress.total}`}
          sub={`${view.items.done} of ${view.items.total} items done across the record`}
          progress={view.items.done / view.items.total}
          rows={view.progress.rows.map((r) => ({ key: r.system, label: r.system, done: r.done || r.unused, current: r.system === view.selected, right: r.summary }))}
          also={view.alsoNeeded}
          alsoLabel={`Also needed before ${view.sponsor}`}
          foot={
            <>
              <SendToSponsor agentId={agentId} />
              {view.items.total - view.items.done > 1 ? (
                <span>
                  <strong>Blocked: {view.items.total - view.items.done} items left.</strong>{' '}
                  {view.next.length ? `Next for ${isOwner ? 'you' : view.owner}: ${view.next.join(', ')}. ` : ''}
                  {view.progress.complete ? '' : `When you finish, the list goes to ${view.tech}’s inbox.`}
                </span>
              ) : null}
            </>
          }
        />
      }
    />
  )
}
