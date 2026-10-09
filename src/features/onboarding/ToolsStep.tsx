import { useMemo, useState } from 'react'
import { HardStopCard } from '../../components'
import { Button, Icon, RuleTag, Table, VisuallyHidden } from '../../design-system'
import { cx } from '../../lib/cx'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import { can, lockReason } from '../../store/permissions'
import { ReturnedPanel } from './ReturnedPanel'
import { SendToSponsor } from './SendToSponsor'
import { selectToolsStep } from './selectors'
import { StepCard } from './StepCard'
import { StepSide } from './StepSide'
import styles from './onboarding.module.css'

/** Step 4: tools from the gateway catalogue, and each hard stop tested on the last 30 days (1d; 1g when returned). */
export function ToolsStep({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const testHardStop = useDemo((s) => s.testHardStop)
  const view = useMemo(() => selectToolsStep(state, agentId), [state, agentId])
  const [open, setOpen] = useState<string | null>(null)
  if (!view) return null
  if (view.state === 'returned' && view.returned) return <ReturnedPanel agentId={agentId} />
  const allowed = !view.frozen && can(state, state.personaId, 'configureTools', { agentId })
  const expanded = view.limits.find((l) => l.code === open) ?? view.limits.find((l) => l.test) ?? view.limits[0]
  const readyLeft = view.items.total - view.items.done
  return (
    <Split
      main={
        <StepCard
          number="04"
          title="Tools and hard stops"
          sub={`Tools come from the gateway catalogue and must match a verb granted in step 3. Hard stops run at the gateway, outside the model, and each is tested on the last 30 days before ${view.sponsor} sees it.`}
          meta={view.meta}
        >
          {!allowed && !view.frozen ? <span className={styles.note}>Read only: {lockReason('configureTools', state.personaId)}.</span> : null}
          <section className={styles.section}>
            <h3 className={styles.caps}>Tools · {view.tools.length} from the gateway catalogue</h3>
            <Table
              ariaLabel="Tools"
              rows={view.tools}
              getRowId={(r) => r.id}
              minRowHeight={48}
              columns={[
                { id: 'tool', header: 'Tool', width: '200px', render: (r) => <span className={styles.monoStrong}>{r.tool}</span> },
                { id: 'grants', header: 'Grants', width: '180px', render: (r) => r.grants },
                { id: 'for', header: 'For', width: 'minmax(0, 1fr)', render: (r) => r.for },
                {
                  id: 'match',
                  header: '', hiddenHeader: 'Check',
                  width: '140px',
                  render: () => (
                    <span className={styles.status}>
                      <Icon name="check" size={12} color="var(--cs-meta)" /> Matches step 3
                    </span>
                  ),
                },
              ]}
            />
          </section>
          <section className={styles.section} data-story-target="tools-hardstops">
            <h3 className={styles.caps}>
              Hard stops · {view.limits.length} from {view.owner}’s never list
            </h3>
            {view.limits.length === 0 ? <span className={styles.note}>The never list is empty, so there are no hard stops to test yet.</span> : null}
            {view.limits.map((l) =>
              l === expanded ? (
                <HardStopCard
                  key={l.code}
                  code={l.label}
                  title={l.title}
                  description={`${l.text} From ${view.owner}’s never list: “${l.from}”.`}
                  rows={[
                    { key: l.library ? 'Library rule' : 'Written', value: l.library ? <RuleTag>{l.library}</RuleTag> : `Plain language · ${view.tech} confirms the wording` },
                    { key: 'Owner', value: l.owner },
                  ]}
                >
                  {l.test ? (
                    <div className={styles.testBox}>
                      <h4 className={styles.caps}>{l.test.head}</h4>
                      <strong className={styles.testResult}>{l.test.resultLong}</strong>
                      {l.test.examples.length ? (
                        <ul className={styles.examples}>
                          {l.test.examples.map((e) => (
                            <li key={e.trace}>
                              <span className={styles.monoMeta}>{e.date}</span>
                              <span className={styles.exampleUnit}>{e.unit}</span>
                              <span className={styles.exampleText}>{e.text}</span>
                              <RuleTag>{e.trace}</RuleTag>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {l.test.examples.length ? <span className={styles.note}>In each, the gateway would have held the draft and the pharmacist would have seen the flag.</span> : null}
                    </div>
                  ) : (
                    <div className={styles.testBox}>
                      <span className={styles.note}>Not tested yet.</span>
                      {allowed ? (
                        <span>
                          <Button variant="primary" onClick={() => testHardStop(agentId, l.code)}>
                            Run test
                          </Button>
                        </span>
                      ) : null}
                    </div>
                  )}
                </HardStopCard>
              ) : (
                <div key={l.code} className={styles.limitRow}>
                  <Icon name="lock" color="var(--cs-text2)" />
                  <RuleTag>{l.label}</RuleTag>
                  <button type="button" className={styles.limitMain} onClick={() => setOpen(l.code)}>
                    <VisuallyHidden>Show {l.code}: </VisuallyHidden>
                    <span className={styles.listName}>{l.title}</span>
                    <span className={styles.listSub}>
                      From “{l.from}” · {l.library ? `library ${l.library}` : 'plain language'}
                    </span>
                  </button>
                  {l.test ? (
                    <span className={styles.limitResult}>
                      <strong>{l.test.result}</strong>
                      <span>{l.test.when}</span>
                    </span>
                  ) : allowed ? (
                    <Button variant="secondary" onClick={() => testHardStop(agentId, l.code)}>
                      Run test
                    </Button>
                  ) : (
                    <span className={styles.limitResult}>
                      <span>Not tested yet</span>
                    </span>
                  )}
                </div>
              ),
            )}
          </section>
        </StepCard>
      }
      side={
        <StepSide
          storyTarget="tools-send"
          title={view.ready || view.state === 'waiting' ? 'Tools and hard stops · done' : `Tools and hard stops · ${view.progress.tested} of ${view.progress.total}`}
          sub={view.ready ? `${view.items.done} of ${view.items.total} items done · only ${view.sponsor}’s approval left` : `${view.items.done} of ${view.items.total} items done across the record`}
          progress={view.items.done / view.items.total}
          rows={[
            { key: 'tools', label: `Tools · ${view.tools.length}`, done: true, right: 'match step 3' },
            ...view.limits.map((l) => ({ key: l.code, label: `${l.code} · ${l.tested ? 'tested' : 'not tested'}`, done: l.tested, right: l.test && l.tested ? l.test.blocks : undefined })),
          ]}
          foot={
            <>
              <SendToSponsor agentId={agentId} />
              {view.state === 'waiting' ? (
                <span>
                  With {view.sponsor} for “Review: final set”. Any edit now resets the review.
                </span>
              ) : view.ready ? (
                <span>
                  Raises “Review: final set” in {view.sponsor}’s inbox. Any edit after you send resets the review.
                </span>
              ) : (
                <span className={cx(styles.blocked)}>
                  <strong>Blocked: {readyLeft - 1} items left</strong> before {view.sponsor} can review.
                </span>
              )}
            </>
          }
        />
      }
    />
  )
}
