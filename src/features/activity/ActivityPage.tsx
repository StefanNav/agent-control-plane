import { useParams, useSearchParams } from 'react-router'
import { AutonomyLadder, PrivilegeCard } from '../../components'
import { Card, DefinitionList, LinkButton, LogRow, Notice, RuleTag, Table, Tabs } from '../../design-system'
import { Body } from '../../layout/layouts'
import { NotFound } from '../../layout/NotFound'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { useDemo } from '../../store'
import { BranchHistory } from '../stepdown/BranchHistory'
import { ReviewLevelTab } from './ReviewLevelTab'
import { historyRows, selectActivityPage, selectEvidenceTab, selectPrivilegeTab, type ActivityTab } from './selectors'
import styles from './activity.module.css'

/** An activity (13a) or one of its branches (15b): its privilege, review level, evidence and history. */
export function ActivityPage() {
  const { activityId = '', branchId = null } = useParams()
  const [params] = useSearchParams()
  const state = useDemo((s) => s)
  const view = selectActivityPage(state, activityId, branchId, state.personaId)
  if (!view) return <NotFound />
  const tab = (view.tabs.find((t) => t.id === params.get('tab'))?.id ?? view.defaultTab) as ActivityTab
  return (
    <>
      <PageHeader
        breadcrumb={view.breadcrumb}
        title={view.title}
        status={view.status}
        idLine={view.idLine}
        tabs={<Tabs ariaLabel="Activity sections" current={tab} items={view.tabs.map((t) => ({ id: t.id, label: t.label, to: t.to }))} />}
      />
      {tab === 'review-level' ? (
        <ReviewLevelTab activityId={view.activityId} />
      ) : tab === 'privilege' ? (
        <PrivilegeTab activityId={view.activityId} />
      ) : tab === 'evidence' ? (
        <EvidenceTab activityId={view.activityId} />
      ) : view.branchId ? (
        <BranchHistory activityId={view.activityId} branchId={view.branchId} />
      ) : (
        <HistoryTab activityId={view.activityId} />
      )}
    </>
  )
}

type BranchRow = ReturnType<typeof selectPrivilegeTab>['branches'][number]

/** Privilege (composed): the privilege in force, and each branch on its ladder (14a's table). */
function PrivilegeTab({ activityId }: { activityId: string }) {
  const state = useDemo((s) => s)
  const view = selectPrivilegeTab(state, activityId)
  return (
    <Body>
      {view.promotion ? (
        <Notice
          mark="review"
          actions={
            <LinkButton to={view.promotion.to} variant="ghost" size="sm">
              Review the promotion
            </LinkButton>
          }
        >
          {view.promotion.text}
        </Notice>
      ) : null}
      {view.card ? (
        <div className={styles.cardWrap}>
          <PrivilegeCard view={view.card} />
        </div>
      ) : null}
      {view.branches.length ? (
        <section className={styles.section} aria-label="Branches">
          <h2 className={styles.caps}>{view.title}</h2>
          <Table<BranchRow>
            ariaLabel="Branches"
            rows={view.branches}
            getRowId={(b) => b.id}
            minRowHeight={84}
            columns={[
              {
                id: 'branch',
                header: 'Branch',
                width: 'minmax(0, 1fr)',
                render: (b) => (
                  <span className={styles.pair}>
                    <span className={styles.name}>{b.name}</span>
                    {b.sub ? <span className={styles.meta}>{b.sub}</span> : null}
                  </span>
                ),
              },
              {
                id: 'level',
                header: 'Level',
                width: '360px',
                render: (b) => (
                  <span className={styles.ladder}>
                    <AutonomyLadder variant="compact" size="wide" labels steps={b.ladder} />
                  </span>
                ),
              },
              { id: 'note', header: 'Note', width: '160px', render: (b) => (b.note.kind === 'tag' ? <span><RuleTag>{b.note.text}</RuleTag></span> : b.note.text) },
            ]}
          />
        </section>
      ) : null}
    </Body>
  )
}

/** Evidence (composed): what the privilege in force was signed on. */
function EvidenceTab({ activityId }: { activityId: string }) {
  const state = useDemo((s) => s)
  const view = selectEvidenceTab(state, activityId)
  return (
    <Body>
      <Card>
        <DefinitionList items={view.rows.map(([key, value]) => ({ key, value }))} />
      </Card>
      {view.promotion ? (
        <section className={styles.section} aria-label="Promotion criteria">
          <h2 className={styles.caps}>{view.promotion.head}</h2>
          <Table
            ariaLabel="Promotion criteria"
            rows={view.promotion.criteria}
            getRowId={(c) => c.label}
            columns={[
              { id: 'label', header: 'Criterion', width: 'minmax(0, 1fr)', render: (c) => c.label },
              { id: 'target', header: 'Target', width: '110px', render: (c) => c.target },
              { id: 'result', header: 'Result', width: '160px', render: (c) => c.result },
              { id: 'met', header: 'Status', width: '120px', render: (c) => (c.met ? 'Met' : 'Not met') },
            ]}
          />
        </section>
      ) : null}
    </Body>
  )
}

/** History (composed): each change of level, newest first. */
function HistoryTab({ activityId }: { activityId: string }) {
  const state = useDemo((s) => s)
  const rows = historyRows(state, activityId)
  return (
    <Body>
      <Card>
        {rows.map((r) => (
          <LogRow key={r.at} time={r.date} sub={r.sub}>
            {r.title}
          </LogRow>
        ))}
      </Card>
    </Body>
  )
}
