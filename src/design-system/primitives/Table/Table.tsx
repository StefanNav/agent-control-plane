import type { KeyboardEvent, ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden'
import styles from './Table.module.css'

export interface Column<Row> {
  id: string
  header: ReactNode
  /** CSS grid track, e.g. '304px' or '1fr'. */
  width: string
  align?: 'left' | 'right'
  render: (row: Row) => ReactNode
  /** Name for screen readers when `header` shows nothing, e.g. an icon or action column. */
  hiddenHeader?: string
}

export interface TableGroup {
  id: string
  label: string
  count?: number
  rowIds: string[]
}

export interface TableProps<Row> {
  columns: Column<Row>[]
  rows: Row[]
  getRowId: (row: Row) => string
  selectedId?: string | null
  onSelect?: (id: string) => void
  onOpen?: (id: string) => void
  /** `board` = 32px rows (monitoring boards); `default` = 44px rows. */
  density?: 'board' | 'default'
  /** Body text size. Default 13 (dense); 14 for non-dense tables. */
  textSize?: 13 | 14
  groups?: TableGroup[]
  /** Hide the header row (e.g. tables continued under a section label). */
  hideHeader?: boolean
  /** Rows to render in `meta` colour (e.g. resolved items). */
  isMuted?: (row: Row) => boolean
  /** Column gap in px. Default 16 (board rows use 12). */
  columnGap?: number
  /** Minimum row height in px, overriding the density (e.g. 56 for the hospital board). */
  minRowHeight?: number
  /** Header row height, for two-line headers (12a); default 32. */
  headHeight?: number
  ariaLabel: string
}

export function Table<Row>({
  columns,
  rows,
  getRowId,
  selectedId = null,
  onSelect,
  onOpen,
  density = 'default',
  textSize = 13,
  groups,
  hideHeader = false,
  isMuted,
  columnGap = 16,
  minRowHeight,
  headHeight,
  ariaLabel,
}: TableProps<Row>) {
  const template = columns.map((column) => column.width).join(' ')
  const grid = { gridTemplateColumns: template, columnGap }
  const byId = new Map(rows.map((row) => [getRowId(row), row]))

  const onRowKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    // Keys pressed in a control inside a cell (link, button, input) belong to that control.
    if (event.target !== event.currentTarget) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const table = event.currentTarget.closest('[role="table"]')
      const all = Array.from(table?.querySelectorAll<HTMLElement>('[data-row-id]') ?? [])
      const index = all.indexOf(event.currentTarget)
      all[index + (event.key === 'ArrowDown' ? 1 : -1)]?.focus()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      // Without an open action, the keyboard selects, as a click does.
      const activate = onOpen ?? onSelect
      activate?.(id)
    }
  }

  const renderRow = (row: Row) => {
    const id = getRowId(row)
    const selected = id === selectedId
    return (
      <div
        key={id}
        role="row"
        data-row-id={id}
        tabIndex={0}
        aria-selected={selected}
        className={cx(
          styles.row,
          density === 'board' && styles.board,
          textSize === 14 && styles.text14,
          selected && styles.selected,
          isMuted?.(row) && styles.muted,
        )}
        style={minRowHeight ? { ...grid, minHeight: minRowHeight } : grid}
        onClick={() => onSelect?.(id)}
        onDoubleClick={() => onOpen?.(id)}
        onKeyDown={(event) => onRowKeyDown(event, id)}
      >
        {columns.map((column) => (
          <div
            key={column.id}
            role="cell"
            data-align={column.align === 'right' ? 'right' : undefined}
            className={cx(styles.cell, column.align === 'right' && styles.right)}
          >
            {column.render(row)}
          </div>
        ))}
      </div>
    )
  }

  const grouped = new Set(groups?.flatMap((group) => group.rowIds) ?? [])

  return (
    <div role="table" aria-label={ariaLabel} className={styles.table}>
      {hideHeader ? null : (
        <div role="row" className={styles.head} style={headHeight ? { ...grid, height: headHeight } : grid}>
          {columns.map((column) => (
            <span
              key={column.id}
              role="columnheader"
              className={cx(styles.label, column.align === 'right' && styles.right)}
            >
              {column.header}
              {column.hiddenHeader ? <VisuallyHidden>{column.hiddenHeader}</VisuallyHidden> : null}
            </span>
          ))}
        </div>
      )}
      {groups?.map((group) => (
        <div key={group.id} role="rowgroup">
          <div role="row" className={styles.group}>
            <span role="cell" className={styles.label}>
              {group.label}
            </span>
            {group.count !== undefined ? (
              <span role="cell" className={styles.label}>
                {group.count}
              </span>
            ) : null}
          </div>
          {group.rowIds
            .map((id) => byId.get(id))
            .filter((row): row is Row => row !== undefined)
            .map(renderRow)}
        </div>
      ))}
      {rows.filter((row) => !grouped.has(getRowId(row))).map(renderRow)}
    </div>
  )
}
