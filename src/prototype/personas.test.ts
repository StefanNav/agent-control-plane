import { matchPath } from 'react-router'
import { routeTable } from '../app/routes'
import { PERSONAS, personaById } from './personas'

test('seven personas, Marcus first', () => {
  expect(PERSONAS.map((p) => p.id)).toEqual(['marcus', 'priya', 'dana', 'sam', 'drlee', 'ana', 'jordan'])
  expect(personaById('drlee')).toMatchObject({ name: 'Dr. Lee', roleLabel: 'AI review board chair', initial: 'L' })
})

test('every landing route exists', () => {
  for (const persona of PERSONAS) {
    expect(routeTable.some((route) => matchPath(route.path, persona.landing)), persona.landing).toBe(true)
  }
})
