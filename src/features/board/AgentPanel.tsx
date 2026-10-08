import { Link } from 'react-router'
import { StatusChip } from '../../components'
import { Icon, LinkButton, RuleTag } from '../../design-system'
import { cx } from '../../lib/cx'
import type { AgentPanel as AgentPanelView } from './selectors'
import styles from './division.module.css'

/** The division view's right-hand panel for the selected agent (4b). */
export function AgentPanel({ panel: p }: { panel: AgentPanelView }) {
  return (
    <aside aria-label="Selected agent" className={styles.panel}>
      <div className={styles.block}>
        <span className={styles.label}>Selected agent</span>
        <Link to={`/operations/agents/${p.id}`} className={cx(styles.agentName, styles.agentLink)}>
          {p.name}
        </Link>
        <span className={styles.mono}>{p.idLine}</span>
        <span className={styles.judgment}>
          <StatusChip status={p.status} label={p.label} />
          {p.ruleTag ? <RuleTag>{p.ruleTag}</RuleTag> : null}
          {p.judgedAt ? <span className={styles.mono}>judged {p.judgedAt}</span> : null}
        </span>
        <span className={styles.people}>{p.people}</span>
      </div>
      <div className={styles.block}>
        <span className={cx(styles.label, styles.labelPad)}>Activities and privileges</span>
        {p.activities.map((a) => (
          <div key={a.id} className={styles.activity}>
            <span className={styles.activityName}>{a.name}</span>
            <span className={styles.activityMeta}>
              <span>{a.level}</span>
              <span className={styles.strong}>{a.grantor}</span>
              {a.review !== '—' ? <span className={styles.monoSmall}>rev {a.review}</span> : null}
              <span className={styles.meta}>{a.domain.replace(' 18+', '')}</span>
            </span>
          </div>
        ))}
      </div>
      <div className={styles.blockGap}>
        <span className={styles.label}>Last 7 days · {p.week.actions} actions</span>
        <div className={styles.week}>
          {(
            [
              [p.week.asIs, 'As is'],
              [p.week.edited, 'Edited'],
              [p.week.rejected, 'Rejected'],
              [p.week.blocked, 'Blocked'],
            ] as const
          ).map(([value, label]) => (
            <span key={label} className={styles.weekStat}>
              <span className={styles.weekValue}>{value}</span>
              <span className={styles.metaSmall}>{label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className={styles.blockGap}>
        <span className={styles.label}>Recent actions</span>
        {p.recent.length ? (
          p.recent.map((r) => (
            <div key={r.id} className={styles.recent}>
              <span className={styles.monoSmall}>{r.at}</span>
              <span className={styles.recentText}>
                <span>{r.title}</span>
                <span className={styles.metaSmall}>{r.outcome}</span>
              </span>
            </div>
          ))
        ) : (
          <span className={styles.metaSmall}>No actions in the last hour.</span>
        )}
      </div>
      <div className={styles.panelFoot}>
        <LinkButton to={`/operations/agents/${p.id}?control=pause`} icon={<Icon name="paused" color="var(--cs-icon)" />}>
          Pause agent
        </LinkButton>
        <LinkButton to={p.recent[0] ? `/operations/actions/${p.recent[0].id}` : `/operations/agents/${p.id}?tab=actions`} variant="ghost">
          Open trace
        </LinkButton>
      </div>
    </aside>
  )
}
