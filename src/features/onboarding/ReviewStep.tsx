import { useMemo } from 'react'
import { StatusChip } from '../../components'
import { DefinitionList, Icon, LinkButton, Notice } from '../../design-system'
import { Split } from '../../layout/layouts'
import { useDemo } from '../../store'
import { onboardingContext, personName } from '../../store/onboardingRules'
import { selectReviewStep } from './selectors'
import { SideCard, StepCard } from './StepCard'
import styles from './onboarding.module.css'

/** Step 6: onboarding is complete; the record is frozen at v1.0 and sits with AIMS Review (1h). */
export function ReviewStep({ agentId }: { agentId: string }) {
  const state = useDemo((s) => s)
  const view = useMemo(() => selectReviewStep(state, agentId), [state, agentId])
  const { people } = onboardingContext(state, agentId)
  if (!view) {
    return (
      <Split
        main={
          <StepCard number="06" title="Ready for review">
            <Notice mark="lock" lead="Not ready yet.">
              Opens when {personName(state, people.sponsor)} approves the set.
            </Notice>
          </StepCard>
        }
        side={null}
      />
    )
  }
  return (
    <Split
      main={
        <StepCard
          number="06"
          title="Ready for review"
          sub="Onboarding is complete. The record is frozen at v1.0 and sits with AIMS Review. The risk tier and the committee packet follow."
          meta="AIMS Review"
        >
          <section className={styles.signature} aria-label="Sponsor signature">
            <h3 className={styles.caps}>Sponsor signature</h3>
            <dl className={styles.signatureGrid}>
              {view.signature.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <span className={styles.note}>{view.rounds}</span>
          </section>
          <section className={styles.section}>
            <h3 className={styles.caps}>What happens next</h3>
            <DefinitionList items={view.next.map(([key, value]) => ({ key, value }))} keyWidth={180} />
          </section>
          <span className={styles.runRow}>
            <LinkButton to={`/portfolio/reviews/${agentId}`}>Open committee packet preview</LinkButton>
            <LinkButton to={`/reports/export?agent=${agentId}`} variant="ghost">
              Download v1.0 as PDF
            </LinkButton>
          </span>
        </StepCard>
      }
      side={
        <SideCard
          label={view.side.title}
          title={view.side.title}
          sub={view.side.sub}
          foot={
            view.side.decided ? (
              <span>
                {view.side.decided}. <LinkButton to={`/inventory/agents/${agentId}`} variant="ghost">Open the record</LinkButton>
              </span>
            ) : (
              <>
                <span>
                  <StatusChip status="review" label="Review: AIMS committee" />
                </span>
                <span>{view.side.waiting}</span>
              </>
            )
          }
        >
          <ul className={styles.checks}>
            {view.side.rows.map((row) => (
              <li key={row.label} className={styles.check}>
                <span className={styles.checkIcon}>
                  <Icon name="check" size={12} color="var(--cs-text2)" />
                </span>
                <span className={styles.checkLabel}>{row.label}</span>
                <span className={styles.checkRight}>{row.who}</span>
              </li>
            ))}
          </ul>
        </SideCard>
      }
    />
  )
}
