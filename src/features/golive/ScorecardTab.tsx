import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { StatusChip } from '../../components'
import { Button, Icon, LinkButton, Notice, Segmented, Sparkline, Table } from '../../design-system'
import { useDemo } from '../../store'
import { can, lockReason } from '../../store/permissions'
import { selectScorecard } from './selectors'
import styles from './golive.module.css'

/** The shadow scorecard (3a): each criterion against its target, why lines differ, the cases compared, and the go-live decision. */
export function ScorecardTab({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const requestGoLive = useDemo((s) => s.requestGoLive)
  const extendShadow = useDemo((s) => s.extendShadow)
  const [params, setParams] = useSearchParams()
  const [error, setError] = useState<string>()
  const withCards = state.activities.filter((a) => a.agentId === agentId && state.scorecards.some((c) => c.activityId === a.id))
  const activityId = withCards.find((a) => a.id === params.get('activity'))?.id ?? withCards[0]?.id ?? ''
  const view = useMemo(() => (activityId ? selectScorecard(state, agentId, activityId) : null), [state, agentId, activityId])
  if (!view) {
    return (
      <div className={styles.layout}>
        <Notice mark="none" lead="No shadow scorecard.">
          Scorecards are kept for agents onboarded through AIMS Review.
        </Notice>
      </div>
    )
  }
  const allowed = can(state, state.personaId, 'requestGoLive', { agentId })
  const g = view.golive
  const code = state.privileges.find((p) => p.activityId === activityId)?.code.toLowerCase()
  const pick = (id: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('activity', id)
        return p
      },
      { replace: true },
    )
  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        {view.activities.length > 1 ? <Segmented aria-label="Activity" value={activityId} onChange={pick} options={view.activities.map((a) => ({ value: a.id, label: a.name }))} /> : null}
        {!view.hasData ? (
          <Notice mark="none" lead="Shadow has just started.">
            {view.empty}
          </Notice>
        ) : (
          <>
            <span className={styles.line}>{view.line}</span>
            <Table
              ariaLabel="Criteria"
              rows={view.criteria}
              getRowId={(c) => c.id}
              minRowHeight={56}
              columns={[
                { id: 'criterion', header: 'Criterion', width: 'minmax(0, 1fr)', render: (c) => <span className={styles.strong}>{c.label}</span> },
                { id: 'target', header: 'Target', width: '96px', render: (c) => c.target },
                { id: 'result', header: 'Result', width: '96px', render: (c) => <span className={styles.result}>{c.result}</span> },
                { id: 'trend', header: `${view.criteria[0]?.trend.length ?? 21} days`, width: '96px', render: (c) => <Sparkline values={c.trend} width={72} height={20} color={c.met ? 'var(--cs-text2)' : 'var(--cs-warn)'} /> },
                {
                  id: 'status',
                  header: 'Status',
                  width: '130px',
                  render: (c) =>
                    c.met ? (
                      <span className={styles.met}>
                        <Icon name="check" size={12} color="var(--cs-meta)" /> Met
                      </span>
                    ) : (
                      <StatusChip status="warn" label="Below target" />
                    ),
                },
              ]}
            />
            {view.causesTitle ? (
              <section>
                <h3 className={styles.caps}>{view.causesTitle}</h3>
                <div className={styles.causes}>
                  {view.causes.map((c) => (
                    <div key={c.label} className={styles.cause}>
                      <span>{c.label}</span>
                      <span className={styles.bar}>
                        <span className={styles.track}>
                          <span className={styles.fill} style={{ width: `${Math.round(c.share * 100)}%` }} />
                        </span>
                        {c.count}
                      </span>
                      <span className={styles.example}>{c.example}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            {view.cases.length ? (
              <section>
                <h3 className={styles.caps}>{view.casesTitle}</h3>
                <Table
                  ariaLabel="Sample cases"
                  rows={view.cases}
                  getRowId={(c) => c.id}
                  minRowHeight={48}
                  columns={[
                    { id: 'enc', header: 'Encounter', width: '110px', render: (c) => c.encounter },
                    { id: 'unit', header: 'Unit', width: '100px', render: (c) => c.unit },
                    { id: 'meds', header: 'Home meds', width: '100px', render: (c) => c.homeMeds },
                    { id: 'agreement', header: 'Agreement', width: '100px', render: (c) => c.agreement },
                    { id: 'diff', header: 'Differences', width: 'minmax(0, 1fr)', render: (c) => c.differences },
                    {
                      id: 'open',
                      header: '',
                      width: '80px',
                      render: (c) => (
                        <LinkButton to={`/operations/agents/${agentId}/cases/${c.id}`} variant="ghost">
                          Open
                        </LinkButton>
                      ),
                    },
                  ]}
                />
              </section>
            ) : null}
          </>
        )}
      </div>
      <section className={styles.side} aria-label="Go-live decision">
        <div className={styles.sideHead}>
          <h2 className={styles.sideTitle}>Go-live decision</h2>
          <span className={styles.sideSub}>{g.sponsor} signs Shadow → Draft for this activity</span>
          {g.shadow ? <span className={styles.sideSub}>{g.shadow}</span> : null}
        </div>
        <ul className={styles.rows}>
          {g.rows.map((r) => (
            <li key={r.label}>
              <span>{'plain' in r ? null : r.ok ? <Icon name="check" size={12} color="var(--cs-text2)" /> : <Icon name="diamond" color="var(--cs-warn)" />}</span>
              <span className={r.ok ? undefined : styles.miss}>{r.label}</span>
              <span>{r.value}</span>
            </li>
          ))}
        </ul>
        <div className={styles.foot}>
          {g.state === 'signed' ? (
            <>
              <strong>{g.signed}.</strong>
              <LinkButton to={`/inventory/privileges/${code}/sign`}>Open the privilege</LinkButton>
            </>
          ) : g.state === 'requested' ? (
            <>
              <StatusChip status="review" label={g.requested ?? ''} />
              <LinkButton to={`/inventory/privileges/${code}/sign`}>Open the signature</LinkButton>
            </>
          ) : (
            <>
              {!allowed ? (
                <Button locked={lockReason('requestGoLive', state.personaId)}>Ask {g.sponsor} to sign</Button>
              ) : g.state === 'running' ? (
                <Button locked={g.runsUntil ?? 'Shadow isn’t finished'}>Ask {g.sponsor} to sign</Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    const result = requestGoLive(activityId)
                    if (!result.ok) setError(result.reason)
                  }}
                >
                  Ask {g.sponsor} to sign
                </Button>
              )}
              {g.state === 'running' ? <span>{g.runsUntil}.</span> : <span>{g.summary}</span>}
              {allowed && view.hasData ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    const result = extendShadow(activityId)
                    if (!result.ok) setError(result.reason)
                  }}
                >
                  Extend shadow by 7 days
                </Button>
              ) : null}
              {g.extended ? <span>{g.extended}.</span> : null}
            </>
          )}
          {error ? <span role="alert">{error}</span> : null}
        </div>
      </section>
    </div>
  )
}
