import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Table, type Column } from './Table'

interface Row {
  id: string
  name: string
  count: number
}

const ROWS: Row[] = [
  { id: 'r1', name: 'Med Rec Agent', count: 147 },
  { id: 'r2', name: 'Renal Dosing Agent', count: 63 },
  { id: 'r3', name: 'Formulary Swap Agent', count: 0 },
]

const COLUMNS: Column<Row>[] = [
  { id: 'name', header: 'Agent', width: '1fr', render: (r) => r.name },
  { id: 'count', header: '24h', width: '56px', align: 'right', render: (r) => r.count },
]

function setup(props: Partial<Parameters<typeof Table<Row>>[0]> = {}) {
  const onSelect = vi.fn()
  const onOpen = vi.fn()
  render(
    <Table
      ariaLabel="Agents"
      columns={COLUMNS}
      rows={ROWS}
      getRowId={(r) => r.id}
      onSelect={onSelect}
      onOpen={onOpen}
      {...props}
    />,
  )
  return { onSelect, onOpen }
}

const bodyRows = () => screen.getAllByRole('row').filter((row) => row.hasAttribute('data-row-id'))

test('column headers render in order', () => {
  setup()
  expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Agent', '24h'])
})

test('clicking a row selects it', async () => {
  const { onSelect } = setup()
  await userEvent.click(screen.getByText('Renal Dosing Agent'))
  expect(onSelect).toHaveBeenCalledWith('r2')
})

test('selected row has aria-selected', () => {
  setup({ selectedId: 'r1' })
  expect(bodyRows()[0]).toHaveAttribute('aria-selected', 'true')
  expect(bodyRows()[1]).toHaveAttribute('aria-selected', 'false')
})

test('ArrowDown and ArrowUp move focus between rows', async () => {
  setup()
  bodyRows()[0]!.focus()
  await userEvent.keyboard('{ArrowDown}')
  expect(bodyRows()[1]).toHaveFocus()
  await userEvent.keyboard('{ArrowUp}')
  expect(bodyRows()[0]).toHaveFocus()
})

test('Enter and Space open the focused row', async () => {
  const { onOpen } = setup()
  bodyRows()[2]!.focus()
  await userEvent.keyboard('{Enter}')
  expect(onOpen).toHaveBeenCalledWith('r3')
  await userEvent.keyboard(' ')
  expect(onOpen).toHaveBeenCalledTimes(2)
})

test('group header renders before its rows', () => {
  setup({ groups: [{ id: 'overdue', label: 'Overdue', count: 2, rowIds: ['r2', 'r3'] }] })
  const rows = screen.getAllByRole('row')
  const headerIndex = rows.findIndex((row) => row.textContent?.includes('Overdue'))
  expect(within(rows[headerIndex]!).getByText('2')).toBeInTheDocument()
  expect(rows[headerIndex + 1]).toHaveAttribute('data-row-id', 'r2')
  expect(rows[headerIndex + 2]).toHaveAttribute('data-row-id', 'r3')
  expect(rows[headerIndex + 3]).toHaveAttribute('data-row-id', 'r1')
})

test('right-aligned cells are marked', () => {
  setup()
  expect(screen.getByText('147').closest('[role="cell"]')).toHaveAttribute('data-align', 'right')
})
