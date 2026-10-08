import { sparklinePath, sparklinePoints } from './sparklinePath'

export interface SparklineProps {
  values: number[]
  /** Default 72 (use 56 in rows). */
  width?: number
  /** Default 20 (use 16 in rows). */
  height?: number
  /** Monitor stale: dashed, `off` colour, no end dot. */
  stale?: boolean
  /** Default true; paused rows hide it. */
  endDot?: boolean
}

export function Sparkline({ values, width = 72, height = 20, stale = false, endDot = true }: SparklineProps) {
  const pts = sparklinePoints(values, width, height)
  const last = pts[pts.length - 1]
  const color = stale ? 'var(--cs-off)' : 'var(--cs-text2)'
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ flex: 'none', display: 'block' }}>
      <path
        d={sparklinePath(values, width, height)}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={stale ? '2 2' : undefined}
      />
      {endDot && !stale && last ? (
        <circle cx={Math.round(last[0] * 100) / 100} cy={Math.round(last[1] * 100) / 100} r={2} fill={color} />
      ) : null}
    </svg>
  )
}
