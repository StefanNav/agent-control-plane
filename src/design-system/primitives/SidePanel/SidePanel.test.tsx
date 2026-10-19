import { render, screen } from '@testing-library/react'
import { SidePanel, SidePanelBlock } from './SidePanel'

test('the title is the panel’s heading, with its sub-lines under it', () => {
  render(<SidePanel title="What starting did" sub="MRA-07 is a draft. Nothing runs yet." />)
  expect(screen.getByRole('heading', { level: 2, name: 'What starting did' })).toBeInTheDocument()
  expect(screen.getByText('MRA-07 is a draft. Nothing runs yet.')).toBeInTheDocument()
})

test('several sub-lines each get their own line', () => {
  render(
    <SidePanel
      title="Go-live decision"
      sub={['Priya signs Shadow → Draft', 'In shadow 21 days']}
    />,
  )
  expect(screen.getByText('Priya signs Shadow → Draft').tagName).toBe('SPAN')
  expect(screen.getByText('In shadow 21 days').tagName).toBe('SPAN')
})

test('with a label it is a named region; without one it is a plain section', () => {
  const { rerender } = render(<SidePanel title="Decision log" label="Decision log" />)
  expect(screen.getByRole('region', { name: 'Decision log' })).toBeInTheDocument()
  rerender(<SidePanel title="Decision log" />)
  expect(screen.queryByRole('region')).toBeNull()
})

test('as="aside" makes it complementary', () => {
  render(<SidePanel as="aside" title="Open gaps · 2" label="Open gaps" />)
  expect(screen.getByRole('complementary', { name: 'Open gaps' })).toBeInTheDocument()
})

test('the foot is a ruled block after the body; extra attributes reach the panel', () => {
  render(
    <SidePanel
      title="What the tier sets"
      foot={<span>Tier 3 adds a board.</span>}
      data-story-target="tier"
    >
      <p>Body</p>
    </SidePanel>,
  )
  const foot = screen.getByText('Tier 3 adds a board.').parentElement!
  expect(
    screen.getByText('Body').compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
  expect(foot.closest('[data-story-target="tier"]')).not.toBeNull()
})

test('a block can sit anywhere in the body', () => {
  render(
    <SidePanel title="Effect on activities">
      <SidePanelBlock>
        <strong>3 activities</strong> re-validate.
      </SidePanelBlock>
    </SidePanel>,
  )
  expect(screen.getByText('3 activities').tagName).toBe('STRONG')
})
