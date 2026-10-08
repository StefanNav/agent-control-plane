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
  /** Fixed value range, e.g. [75, 100] for acceptance trends. Default: the values' own range. */
  domain?: [number, number]
  /** Default 1.5 (board rows use 1.25). */
  strokeWidth?: number
  /** Default 2 (board rows use 1.75). */
  dotRadius?: number
}

export function Sparkline({
  values,
  width = 72,
  height = 20,
  stale = false,
  endDot = true,
  domain,
  strokeWidth = 1.5,
  dotRadius = 2,
}: SparklineProps) {
  const pts = sparklinePoints(values, width, height, domain)
  const last = pts[pts.length - 1]
  const color = stale ? 'var(--cs-off)' : 'var(--cs-text2)'
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ flex: 'none', display: 'block' }}>
      <path
        d={sparklinePath(values, width, height, domain)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={stale ? '2 2' : undefined}
      />
      {endDot && !stale && last ? (
        <circle cx={Math.round(last[0] * 100) / 100} cy={Math.round(last[1] * 100) / 100} r={dotRadius} fill={color} />
      ) : null}
    </svg>
  )
}
