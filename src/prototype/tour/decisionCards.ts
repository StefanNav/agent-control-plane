import { CARDS, type CardContent } from './cards'

export type Decision = Extract<CardContent, { kind: 'decision' }>
export type ImageCard = Extract<CardContent, { kind: 'image' }>

export function decision(id: string): Decision {
  const card = CARDS[id]
  if (card?.kind !== 'decision') throw new Error(`No decision card ${id}`)
  return card
}

export function image(id: string): ImageCard {
  const card = CARDS[id]
  if (card?.kind !== 'image') throw new Error(`No image card ${id}`)
  return card
}

/** The five direction overviews, in the order they were explored. */
export const DIRECTIONS = [
  'explore-ledger',
  'explore-ward-round',
  'explore-countersign',
  'explore-linen',
  'explore-handover',
].map(image)
/** The first direction on a crowded screen, where it broke. */
export const CONFLICT = image('explore-ledger-conflict')
/** The stress test's two screens, then the final division view. */
export const JUDGED = [
  'explore-stress-division',
  'explore-stress-signing',
  'explore-final-division',
].map(image)
