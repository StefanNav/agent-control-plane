import { useId, useMemo, useState } from 'react'
import { RETEST_CASES } from '../../data/seed/catalogue'
import { Button, Field, Icon, RuleTag, Select } from '../../design-system'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import { can, lockReason } from '../../store/permissions'
import { ReturnedNote } from './ReturnedNote'
import { SendToSponsor } from './SendToSponsor'
import { selectReturned, selectToolsStep } from './selectors'
import { StepCard } from './StepCard'
import { StepSide } from './StepSide'
import styles from './onboarding.module.css'

/** The case set for a range and filter, if the catalogue names one; otherwise the plain 30-day test. */
const caseSet = (range: string, only: string) => Object.entries(RETEST_CASES.sets).find(([, set]) => set.range === range && set.only === only)?.[0]

/** Step 4 sent back by the sponsor (1g): only the row it's about reopens; everything else stays as reviewed. */
export function ReturnedPanel({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const testHardStop = useDemo((s) => s.testHardStop)
  const view = useMemo(() => selectToolsStep(state, agentId), [state, agentId])
  const returned = useMemo(() => selectReturned(state, agentId, state.personaId), [state, agentId])
  const [range, setRange] = useState(RETEST_CASES.ranges[0]!)
  const [only, setOnly] = useState(RETEST_CASES.only[0]!)
  const casesId = useId()
  const onlyId = useId()
  if (!view || !returned) return null
  const allowed = can(state, state.personaId, 'configureTools', { agentId })
  const about = returned.about
  const target = view.limits.find((l) => l.code === about?.code)
  const others = view.limits.filter((l) => l.code !== about?.code)
  return (
    <Split
      main={
        <StepCard
          number="04"
          title="Tools and hard stops"
          sub={`${returned.sponsor} sent this step back. ${about ? `Only ${about.code} is open; everything else stays as ${returned.sponsor} reviewed it.` : 'The job and reach are open for changes.'}`}
          meta={view.meta}
        >
          <ReturnedNote agentId={agentId} />
          {target ? (
            <section className={styles.section}>
              <h3 className={styles.caps}>
                {target.label} · {target.reopened ? 're-test' : 're-tested'}
              </h3>
              <div className={styles.retest}>
                <span>
                  <h4 className={styles.retestTitle}>{target.title}</h4>
                  <span className={styles.note}>{target.reopened ? target.last : `${target.test?.result} · ${target.test?.when}`}</span>
                </span>
                <div className={styles.selects}>
                  <Field label="Cases" htmlFor={casesId}>
                    <Select id={casesId} value={range} onChange={setRange} locked={!allowed} options={RETEST_CASES.ranges.map((r) => ({ value: r, label: r }))} />
                  </Field>
                  <Field label="Only" htmlFor={onlyId}>
                    <Select id={onlyId} value={only} onChange={setOnly} locked={!allowed} options={RETEST_CASES.only.map((o) => ({ value: o, label: o }))} />
                  </Field>
                </div>
                <span className={styles.runRow}>
                  {allowed ? (
                    <Button variant="primary" onClick={() => testHardStop(agentId, target.code, caseSet(range, only))}>
                      Run test
                    </Button>
                  ) : (
                    <Button locked={lockReason('configureTools', state.personaId)}>Run test</Button>
                  )}
                  <span className={styles.monoMeta}>about 2 min · results replace the last test</span>
                </span>
              </div>
            </section>
          ) : null}
          {others.map((l) => (
            <div key={l.code} className={styles.limitRow}>
              <Icon name="lock" color="var(--cs-text2)" />
              <RuleTag>{l.label}</RuleTag>
              <span className={styles.limitMain}>
                <span className={styles.listName}>{l.title}</span>
                <span className={styles.listSub}>As {returned.sponsor} reviewed it</span>
              </span>
              <span className={styles.limitResult}>
                <strong>{l.test?.result ?? 'Not tested'}</strong>
                <span>{l.test ? `tested ${l.test.on}` : ''}</span>
              </span>
            </div>
          ))}
        </StepCard>
      }
      side={
        <StepSide
          title="Tools and hard stops · returned"
          sub={`${view.items.done} of ${view.items.total} items done`}
          progress={view.items.done / view.items.total}
          rows={[
            { key: 'tools', label: `Tools · ${view.tools.length}`, done: true, right: 'unchanged' },
            ...view.limits.map((l) =>
              l.code === about?.code
                ? { key: l.code, label: `${l.code} · ${l.reopened ? 're-test' : 're-tested'}`, done: !l.reopened, current: l.reopened, right: l.reopened ? `${returned.sponsor} asked` : l.test?.blocks }
                : { key: l.code, label: `${l.code} · tested`, done: true, right: 'unchanged' },
            ),
          ]}
          foot={
            <>
              <SendToSponsor agentId={agentId} again />
              {target?.reopened ? (
                <span>
                  <strong>Blocked:</strong> re-run {target.code} on the cases {returned.sponsor} named. Replying is optional.
                </span>
              ) : (
                <span>Raises “Review: final set” in {returned.sponsor}’s inbox again.</span>
              )}
            </>
          }
        />
      }
    />
  )
}
