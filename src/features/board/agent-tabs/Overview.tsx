import { Link } from 'react-router'
import { Card, LinkButton, Notice, RuleTag, StatStrip, Table } from '../../../design-system'
import { cx } from '../../../lib/cx'
import type { AgentOverview } from '../selectors'
import styles from './agent.module.css'
import { ACTIVITY_COLUMNS, RECENT_COLUMNS } from './columns'

/** The agent view's Overview tab (4c). */
export function Overview({ view }: { view: AgentOverview }) {
  return (
    <div className={styles.split}>
      <div className={styles.main}>
        {view.banner ? (
          <Notice
            mark={view.banner.status === 'crit' ? 'crit' : view.banner.status === 'warn' ? 'warn' : 'review'}
            lead={view.banner.headline}
            actions={
              <>
                <LinkButton to={`/operations/inbox/${view.banner.exceptionId}`} variant="ghost" size="sm">
                  {view.banner.action}
                </LinkButton>
                {view.banner.ruleTag ? (
                  <LinkButton to={`/inventory/agents/${view.id}/onboarding/tools`} variant="ghost" size="sm">
                    Open {view.banner.ruleTag}
                  </LinkButton>
                ) : null}
              </>
            }
          >
            {view.banner.cause}
          </Notice>
        ) : null}
        <StatStrip stats={view.stats} />
        <section className={styles.section}>
          <h2 className={styles.label}>Activities</h2>
          <Table ariaLabel="Activities" columns={ACTIVITY_COLUMNS} rows={view.activities} getRowId={(a) => a.id} />
        </section>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.label}>Recent actions</h2>
            <Link to={`/operations/agents/${view.id}?tab=actions`} className={styles.allLink}>
              All actions
            </Link>
          </div>
          <Table ariaLabel="Recent actions" columns={RECENT_COLUMNS} rows={view.recent} getRowId={(r) => r.id} />
        </section>
      </div>
      <div className={styles.side}>
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
            <span className={cx(styles.dot, view.monitoring.freshness !== 'live' && styles.dotLate)} />
            <span>Last data</span>
            <span className={styles.cardValue}>{view.monitoring.last}</span>
          </div>
          <div className={styles.cardRow}>
            <span className={styles.dot} />
            <span>Gateway</span>
            <span className={styles.cardValue}>{view.monitoring.gateway}</span>
          </div>
          <div className={styles.cardFoot}>If data stops, the agent shows Monitor stale here and on the division board, never grey.</div>
        </Card>
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
