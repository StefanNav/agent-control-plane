import { Tabs } from '../../design-system'

/**
 * A division's sections (11a draws them under the header). R17: Board, Reviewer behaviour and
 * (Phase 7) Sampling have pages; 11a's Exceptions and Scorecards have none.
 */
export function DivisionTabs({ divisionId, current }: { divisionId: string; current: 'board' | 'reviewers' | 'sampling' }) {
  return (
    <Tabs
      ariaLabel="Division sections"
      current={current}
      items={[
        { id: 'board', label: 'Board', to: `/operations/divisions/${divisionId}` },
        { id: 'reviewers', label: 'Reviewer behaviour', to: `/operations/reviewers?division=${divisionId}` },
        { id: 'sampling', label: 'Sampling', to: '/operations/sampling' },
      ]}
    />
  )
}
