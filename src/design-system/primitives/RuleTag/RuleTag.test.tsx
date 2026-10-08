import { render, screen } from '@testing-library/react'
import { LogRow } from '../LogRow/LogRow'
import { Avatar } from '../Avatar/Avatar'
import { Card } from '../Card/Card'
import { Paper } from '../Paper/Paper'
import { RuleTag } from './RuleTag'

test('rule tag shows its id', () => {
  render(<RuleTag>HS-04 v2</RuleTag>)
  expect(screen.getByText('HS-04 v2')).toBeInTheDocument()
})

test('log row shows time, text and sub-line', () => {
  render(
    <LogRow time="09:47" sub="Logs Marcus">
      Paused Med Rec Agent
    </LogRow>,
  )
  expect(screen.getByText('09:47')).toBeInTheDocument()
  expect(screen.getByText('Paused Med Rec Agent')).toBeInTheDocument()
  expect(screen.getByText('Logs Marcus')).toBeInTheDocument()
})

test('avatar shows the initial', () => {
  render(<Avatar initial="M" />)
  expect(screen.getByText('M')).toBeInTheDocument()
})

test('card and paper render their children', () => {
  render(
    <>
      <Card>in a card</Card>
      <Paper>on paper</Paper>
    </>,
  )
  expect(screen.getByText('in a card')).toBeInTheDocument()
  expect(screen.getByText('on paper')).toBeInTheDocument()
})
