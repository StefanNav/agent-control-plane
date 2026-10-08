import { Tabs } from '../../design-system'

/**
 * A division's sections (11a draws them under the header). R17: Board and Reviewer behaviour have
 * pages; 11a's Exceptions and Scorecards have none, and Sampling arrives with Phase 7.
 */
export function DivisionTabs({ divisionId, current }: { divisionId: string; current: 'board' | 'reviewers' }) {
  return (
    <Tabs
      ariaLabel="Division sections"
      current={current}
      items={[
        { id: 'board', label: 'Board', to: `/operations/divisions/${divisionId}` },
        { id: 'reviewers', label: 'Reviewer behaviour', to: `/operations/reviewers?division=${divisionId}` },
      ]}
    />
  )
}
