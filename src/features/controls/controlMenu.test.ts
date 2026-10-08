import { createSeed } from '../../data/seed'
import { controlMenu } from './controlMenu'

const s = createSeed()

test('6a as Marcus: scope first, narrow fixes, program-lead actions locked', () => {
  const groups = controlMenu(s, 'marcus', 'med-rec')
  expect(groups.map((g) => g.label)).toEqual(['Pause', 'Narrow fixes', 'Program lead or sponsor'])
  expect(groups[0]!.items.map((i) => [i.label, i.sub, i.control, i.locked])).toEqual([
    ['Pause this activity…', 'Reconcile home medications at admission', 'pause-activity', false],
    ['Pause this agent…', 'Both activities', 'pause-agent', false],
    ['Pause every agent in Medications…', '20 agents', 'pause-division', false],
  ])
  expect(groups[1]!.items.map((i) => [i.label, i.sub, i.control])).toEqual([
    ['Revoke a tool…', '7 tool grants', 'revoke'],
    ['Return an activity to Shadow…', 'Back to Draft needs Priya again', 'shadow'],
  ])
  expect(groups[2]!.items.map((i) => [i.label, i.sub, i.locked])).toEqual([
    ['Disable…', 'Dana or Priya', true],
    ['Retire…', 'Dana or Priya', true],
  ])
})

test('6a as Jordan: every control is locked', () => {
  expect(controlMenu(s, 'jordan', 'med-rec').flatMap((g) => g.items).every((i) => i.locked)).toBe(true)
})

test('6a as Dana: program-lead actions open', () => {
  const items = controlMenu(s, 'dana', 'med-rec').flatMap((g) => g.items)
  expect(items.find((i) => i.control === 'retire')!.locked).toBe(false)
})
