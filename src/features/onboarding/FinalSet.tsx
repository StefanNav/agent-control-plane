import type { ReactNode } from 'react'
import { RuleTag } from '../../design-system'
import { cx } from '../../lib/cx'
import { useDemo } from '../../store'
import { selectFinalSet } from './selectors'
import styles from './onboarding.module.css'

function SetRow({ k, children, right }: { k: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className={styles.setRow}>
      <span className={styles.setKey}>{k}</span>
      <span className={styles.setValue}>{children}</span>
      <span className={styles.setRight}>{right}</span>
    </div>
  )
}

/** Job, reach and limits on one page, as the committee will read them (1e, 1f). */
export function FinalSet({ agentId, picked, onPick }: { agentId: string; picked?: string | null; onPick?: (code: string) => void }) {
  const state = useDemo((s) => s)
  const set = selectFinalSet(state, agentId)
  if (!set) return null
  return (
    <>
      <section className={styles.setGroup}>
        <h3 className={styles.caps}>{set.job.heading}</h3>
        <div>
          <SetRow k="Purpose">{set.job.purpose}</SetRow>
          <SetRow k="Does">
            {set.job.does.map((a) => (
              <span key={a.id} className={styles.doesLine}>
                {a.name}
                <span className={styles.setKey}>Shadow</span>
              </span>
            ))}
          </SetRow>
          <SetRow k="Hands off when">
            {set.job.handsOff.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </SetRow>
          <SetRow k="Acts for">{set.job.actsFor}</SetRow>
          <SetRow k="Goes live if">
            {set.job.goesLive.map((c) => (
              <span key={c.id}>{c.text}</span>
            ))}
          </SetRow>
          <SetRow k="Works on">{set.job.worksOn}</SetRow>
        </div>
      </section>
      <section className={styles.setGroup}>
        <h3 className={styles.caps}>{set.reach.heading}</h3>
        <div>
          {set.reach.rows.map((r) => (
            <SetRow key={r.system} k={r.system}>
              {r.verbs}
            </SetRow>
          ))}
          <SetRow k="Nowhere">
            <span>
              Submit, sign or order <RuleTag>ORG-POL-02</RuleTag>
            </span>
          </SetRow>
        </div>
      </section>
      <section className={styles.setGroup}>
        <h3 className={styles.caps}>{set.limits.heading}</h3>
        <div className={styles.list}>
          {set.limits.rows.map((l) =>
            onPick ? (
              <button key={l.code} type="button" className={cx(styles.limitPick, picked === l.code && styles.limitPicked)} aria-pressed={picked === l.code} onClick={() => onPick(l.code)}>
                <RuleTag>{l.label}</RuleTag>
                <span>{l.title}</span>
                <span className={styles.setRight}>{l.result}</span>
              </button>
            ) : (
              <div key={l.code} className={styles.limitPick}>
                <RuleTag>{l.label}</RuleTag>
                <span>{l.title}</span>
                <span className={styles.setRight}>{l.result}</span>
              </div>
            ),
          )}
          <div className={styles.limitPick}>
            <span className={styles.setKey}>Tools</span>
            <span>{set.limits.tools}</span>
            <span />
          </div>
        </div>
      </section>
    </>
  )
}
