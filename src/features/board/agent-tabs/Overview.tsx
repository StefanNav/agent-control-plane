import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { noticeMark } from '../../../components'
import { Card, LinkButton, Notice, RuleTag, StatStrip, Table } from '../../../design-system'
import { cx } from '../../../lib/cx'
import type { AgentOverview } from '../selectors'
import styles from './agent.module.css'
import { ACTIVITY_COLUMNS, RECENT_COLUMNS } from './columns'

/** The agent view's Overview tab (4c); while paused, the 6d layout with the resume panel. */
export function Overview({ view, resume = null }: { view: AgentOverview; resume?: ReactNode }) {
  // Paused as a whole (6d) hides the working sections; one paused activity keeps them.
  const stopped = Boolean(view.paused && view.paused.scope !== 'activity')
  return (
    <div className={styles.split}>
      <div className={styles.main}>
        {view.retired ? (
          <Notice mark="lock" lead={`Retired by ${view.retired.by} on ${view.retired.at} · ${view.retired.code}.`}>
            {view.retired.reason} The record stays searchable in audit and exports.
          </Notice>
        ) : null}
        {view.paused ? <Notice lead={view.paused.lead}>{view.paused.text}</Notice> : null}
        {view.paused ? resume : null}
        {!stopped && !view.retired && view.banner ? (
          <div data-story-target="agent-summary">
            <Notice
              mark={noticeMark(view.banner.status)}
              lead={view.banner.headline}
              actions={
                <>
                  <LinkButton
                    to={`/operations/inbox/${view.banner.exceptionId}`}
                    variant="ghost"
                    size="sm"
                  >
                    {view.banner.action}
                  </LinkButton>
                  {view.banner.ruleTag ? (
                    <LinkButton
                      to={`/inventory/agents/${view.id}/onboarding/tools`}
                      variant="ghost"
                      size="sm"
                    >
                      Open {view.banner.ruleTag}
                    </LinkButton>
                  ) : null}
                </>
              }
            >
              {view.banner.cause}
            </Notice>
          </div>
        ) : null}
        {stopped || view.retired ? null : <StatStrip stats={view.stats} />}
        <section className={styles.section}>
          <h2 className={styles.label}>Activities</h2>
          <Table
            ariaLabel="Activities"
            columns={ACTIVITY_COLUMNS}
            rows={view.activities}
            getRowId={(a) => a.id}
          />
        </section>
        {stopped ? null : (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.label}>Recent actions</h2>
              <Link to={`/operations/agents/${view.id}?tab=actions`} className={styles.allLink}>
                All actions
              </Link>
            </div>
            <Table
              ariaLabel="Recent actions"
              columns={RECENT_COLUMNS}
              rows={view.recent}
              getRowId={(r) => r.id}
            />
          </section>
        )}
      </div>
      <div className={styles.side}>
        {view.paused ? (
          <Card>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>While paused</span>
            </div>
            <div className={styles.cardRow}>
              <span>Drafts routed</span>
              <span className={styles.cardValue}>{view.paused.whilePaused.routed}</span>
            </div>
            <div className={styles.cardRow}>
              <span>Reconciled by hand</span>
              <span className={styles.cardValue}>{view.paused.whilePaused.byHand}</span>
            </div>
            <div className={styles.cardRow}>
              <span>Incident</span>
              <span className={styles.cardValue}>
                {view.paused.whilePaused.incidentId ? (
                  <Link to={`/operations/incidents/${view.paused.whilePaused.incidentId}`}>
                    {view.paused.whilePaused.incident}
                  </Link>
                ) : (
                  'None open'
                )}
              </span>
            </div>
            <div className={styles.cardRow}>
              <span>Paused for</span>
              <span className={styles.cardValue}>{view.paused.whilePaused.pausedFor}</span>
            </div>
            <div className={styles.cardSpacer} />
          </Card>
        ) : null}
        {stopped ? null : (
          <>
            <Card>
              <div className={styles.cardHead}>
                <span className={styles.cardTitle}>Hard stops today</span>
              </div>
              {view.hardStops.length ? (
                view.hardStops.map((h) => (
                  <div key={h.tag} className={cx(styles.cardRow, h.fired !== '0' && styles.ink)}>
                    <span>
                      <RuleTag>{h.tag}</RuleTag> {h.title}
                    </span>
                    <span className={styles.cardValue}>{h.fired}</span>
                  </div>
                ))
              ) : (
                <div className={styles.cardRow}>
                  <span>None configured</span>
                </div>
              )}
              <div className={styles.cardSpacer} />
            </Card>
            <Card>
              <div className={styles.cardHead}>
                <span className={styles.cardTitle}>Monitoring</span>
                <span className={styles.cardSub}>{view.monitoring.interval}</span>
              </div>
              <div className={styles.cardRow}>
                <span
                  className={cx(styles.dot, view.monitoring.freshness !== 'live' && styles.dotLate)}
                />
                <span>Last data</span>
                <span className={styles.cardValue}>{view.monitoring.last}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.dot} />
                <span>Gateway</span>
                <span className={styles.cardValue}>{view.monitoring.gateway}</span>
              </div>
              <div className={styles.cardFoot}>
                If data stops, the agent shows Monitor stale here and on the division board, never
                grey.
              </div>
            </Card>
          </>
        )}
        <Card>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>People</span>
          </div>
          {view.people.map((p) => (
            <div key={p.role} className={styles.cardRow}>
              <span>{p.role}</span>
              <span className={styles.cardValueInk}>{p.name}</span>
            </div>
          ))}
          <div className={styles.cardSpacer} />
        </Card>
      </div>
    </div>
  )
}
