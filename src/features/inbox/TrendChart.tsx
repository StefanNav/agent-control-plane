import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import styles from './TrendChart.module.css'

export interface TrendChartProps {
  /** "Edit rate · 14 days": the title, and the chart's accessible name. */
  label: string
  /** Daily values, oldest first. */
  values: number[]
  /** One date label per value, e.g. '25 Nov'. */
  days: string[]
  /** The target, drawn as a dashed line. */
  target?: number
  unit?: string
  /** Colour of the latest point: the exception's status colour. */
  accent?: string
}

const W = 640
const H = 112
const PAD_X = 6
const FLOOR = H - 6
/** Headroom above the highest value, so the end dot and its ring never clip. */
const HEADROOM = 0.26 * H

/** A single-series line against a dashed target (5a): one axis, no legend, hover and keyboard readout. */
export function TrendChart({ label, values, days, target, unit = '%', accent = 'var(--cs-warn)' }: TrendChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const top = Math.max(...values, target ?? 0)
  const k = top > 0 ? (FLOOR - HEADROOM) / top : 0
  const x = (i: number) => PAD_X + (values.length > 1 ? (i * (W - 2 * PAD_X)) / (values.length - 1) : 0)
  const y = (v: number) => FLOOR - v * k
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = values.length - 1
  const fmt = (v: number) => `${v} ${unit}`

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const px = ((event.clientX - box.left) / box.width) * W
    const i = Math.round(((px - PAD_X) / (W - 2 * PAD_X)) * last)
    setActive(Math.min(last, Math.max(0, i)))
  }
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const step = event.key === 'ArrowRight' ? 1 : -1
    setActive((i) => Math.min(last, Math.max(0, (i ?? last) + step)))
  }

  const summary = `${label}: ${fmt(values[0] ?? 0)} on ${days[0]} to ${fmt(values[last] ?? 0)} today${target !== undefined ? `, target ${fmt(target)}` : ''}`
  const tip = active === null ? null : { left: (x(active) / W) * 100, day: active === last ? 'Today' : days[active], value: values[active] ?? 0 }

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>{label}</figcaption>
      <div className={styles.plot}>
        <svg
          role="img"
          aria-label={summary}
          tabIndex={0}
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className={styles.svg}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(last)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
        >
          {target !== undefined ? (
            <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="var(--cs-icon)" strokeWidth={1} strokeDasharray="4 3" />
          ) : null}
          {active !== null ? <line x1={x(active)} x2={x(active)} y1={0} y2={H} stroke="var(--cs-line-strong)" strokeWidth={1} /> : null}
          <polyline points={points} fill="none" stroke="var(--cs-text2)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active !== null && active !== last ? (
            <circle cx={x(active)} cy={y(values[active] ?? 0)} r={4} fill="var(--cs-text2)" stroke="var(--cs-raised)" strokeWidth={2} />
          ) : null}
          <circle cx={x(last)} cy={y(values[last] ?? 0)} r={4} fill={accent} stroke="var(--cs-raised)" strokeWidth={2} />
        </svg>
        {tip ? (
          <span className={styles.tip} style={{ left: `${tip.left}%` }} aria-hidden="true">
            <span className={styles.tipDay}>{tip.day}</span>
            <span className={styles.tipValue}>{fmt(tip.value)}</span>
          </span>
        ) : null}
      </div>
      <div className={styles.axis} aria-hidden="true">
        <span>{days[0]}</span>
        {target !== undefined ? <span>Dashed line · target {fmt(target)}</span> : null}
        <span>Today</span>
      </div>
      <table className={styles.srOnly}>
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {values.map((v, i) => (
            <tr key={days[i] ?? i}>
              <th scope="row">{i === last ? 'Today' : days[i]}</th>
              <td>{fmt(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
