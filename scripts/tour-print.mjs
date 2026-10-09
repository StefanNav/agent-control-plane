import { loadTour } from './tour-load.mjs'

/** One action as `kind: detail`, e.g. `click: agent-row`. */
function describeAction(action) {
  switch (action.kind) {
    case 'outline':
    case 'scroll':
    case 'click':
      return `${action.kind}: ${action.target}`
    case 'type':
      return `type: ${action.target} ← "${action.text}"`
    case 'card':
      return `card: ${action.card}${action.side ? ` (${action.side})` : ''}`
    case 'clearCard':
      return 'clearCard'
    case 'wait':
      return `wait: ${action.ms} ms`
    default:
      return JSON.stringify(action)
  }
}

/** One beat: its text, then its actions and reveal in brackets. */
function describeBeat(beat, number) {
  const notes = [...(beat.actions ?? []).map(describeAction)]
  if (beat.reveal) notes.push(`reveal: ${beat.reveal}`)
  const brackets = notes.map((note) => ` \`[${note}]\``).join('')
  return `${number}. ${beat.text}${brackets}`
}

/** A step's heading line: its route, then its scenario and persona when it has them. */
function describeStep(step) {
  const parts = [`\`${step.route}\``]
  if (step.scenario) parts.push(`scenario \`${step.scenario}\``)
  if (step.persona) parts.push(`as \`${step.persona}\``)
  return parts.join(' · ')
}

const { CHAPTERS } = await loadTour()

const lines = ['# Tour script', '']
CHAPTERS.forEach((chapter, index) => {
  const decision = chapter.decision ? ` · decision ${chapter.decision}` : ''
  lines.push(`## ${index} · ${chapter.title}${decision}`, '')
  let number = 0
  for (const step of chapter.steps) {
    lines.push(`*${describeStep(step)}*`, '')
    for (const beat of step.beats) lines.push(describeBeat(beat, ++number))
    lines.push('')
  }
})
process.stdout.write(`${lines.join('\n').trimEnd()}\n`)
