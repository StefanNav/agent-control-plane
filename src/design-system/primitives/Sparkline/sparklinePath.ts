const PAD = 2

function round(n: number): string {
  return String(Math.round(n * 100) / 100)
}

export function sparklinePoints(values: number[], width: number, height: number): Array<[number, number]> {
  if (values.length < 2) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  return values.map((v, i) => {
    const x = PAD + (i * (width - 2 * PAD)) / (values.length - 1)
    const y = max === min ? height / 2 : PAD + (1 - (v - min) / (max - min)) * (height - 2 * PAD)
    return [x, y]
  })
}

/** SVG path for a sparkline in a width×height box with 2px padding. Fewer than 2 values → ''. */
export function sparklinePath(values: number[], width: number, height: number): string {
  return sparklinePoints(values, width, height)
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`)
    .join('')
}
