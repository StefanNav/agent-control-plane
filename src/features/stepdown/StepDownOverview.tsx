import { useNavigate } from 'react-router'
import { AutonomyLadder } from '../../components'
import { Button, LinkButton, Notice } from '../../design-system'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import { nextIncidentCode } from '../../store/mutations'
import { can, lockReason } from '../../store/permissions'
import { TrendChart } from '../inbox/TrendChart'
import type { selectStepDown } from './selectors'
import styles from './stepdown.module.css'

type View = NonNullable<ReturnType<typeof selectStepDown>>

/** 15a: the agent view's Overview while an activity is stepped down on a threshold breach. */
export function StepDownOverview({ agentId, view }: { agentId: string; view: View }) {
  const state = useDemo((s) => s)
  const openIncident = useDemo((s) => s.openIncident)
  const navigate = useNavigate()
  const allowed = can(state, state.personaId, 'openIncident', { agentId })
  const startIncident = () => {
    const code = nextIncidentCode(state)
    if (openIncident(agentId, { title: view.incidentTitle, actionIds: [] }).ok) navigate(`/operations/incidents/${code.toLowerCase()}`)
  }
  return (
    <Split
      main={
        <>
          <div data-story-target="stepdown-notice">
            <Notice
              mark="warn"
              lead={view.notice.lead}
              actions={
                <>
                  {view.exceptionId ? (
                    <LinkButton to={`/operations/inbox/${view.exceptionId}`} variant="ghost" size="sm">
                      Open the exception
                    </LinkButton>
                  ) : null}
                  {view.incident ? (
                    <LinkButton to={`/operations/incidents/${view.incident.id}`} variant="ghost" size="sm">
                      {`Open ${view.incident.code}`}
                    </LinkButton>
                  ) : allowed ? (
                    <Button variant="ghost" size="sm" onClick={startIncident}>
                      Start an incident
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" locked={lockReason('openIncident', state.personaId)}>
                      Start an incident
                    </Button>
                  )}
                </>
              }
            >
              {view.notice.text}
            </Notice>
          </div>
          {view.chart ? (
            <TrendChart
              label={view.chart.label}
              values={view.chart.values}
              days={view.chart.days}
              target={view.chart.target}
              targetLabel={view.chart.targetLabel}
              highlight={view.chart.highlight}
              width={980}
            />
          ) : null}
          <section className={styles.section} aria-label={view.happenedHead}>
            <h2 className={styles.caps}>{view.happenedHead}</h2>
            <div className={styles.list}>
              {view.happened.map((h) => (
                <div key={h.title} className={styles.happened}>
                  <span className={styles.big}>{h.n}</span>
                  <span className={styles.pair}>
                    <span className={styles.title}>{h.title}</span>
                    <span className={styles.meta}>{h.sub}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className={styles.section} aria-label={view.backHead}>
            <h2 className={styles.caps}>{view.backHead}</h2>
            <ol className={styles.list}>
              {view.back.map((b) => (
                <li key={b.n} className={styles.back}>
                  <span className={styles.n}>{b.n}</span>
                  <span className={styles.pair}>
                    <span className={styles.title}>{b.title}</span>
                    <span className={styles.meta}>{b.sub}</span>
                  </span>
                  <span className={styles.who}>{b.who}</span>
                </li>
              ))}
            </ol>
          </section>
          <p className={styles.foot}>{view.footnote}</p>
        </>
      }
      side={
        <>
          <section className={styles.side} aria-label="Autonomy level">
            <div className={styles.pair}>
              <h2 className={styles.sideTitle}>{view.ladderTitle}</h2>
              <span className={styles.sideSub}>Autonomy level</span>
            </div>
            <AutonomyLadder variant="compact" size="wide" labels steps={view.ladder} />
            <p className={styles.note}>
              <strong>Dashed:</strong> {view.held}
            </p>
          </section>
          <section className={styles.side} aria-label="Timeline">
            <h2 className={styles.sideTitle}>Timeline</h2>
            <ol className={styles.timeline}>
              {view.timeline.map((t, i) => (
                <li key={i} className={styles.event}>
                  <span className={styles.time}>{t.at}</span>
                  <span className={styles.pair}>
                    <span className={styles.title}>{t.title}</span>
                    <span className={styles.meta}>{t.sub}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </>
      }
    />
  )
}
