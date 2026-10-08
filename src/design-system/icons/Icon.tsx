import { ICONS, type IconName } from './paths'

export type { IconName } from './paths'

export interface IconProps {
  name: IconName
  /** Rendered width and height in px. Default 12. */
  size?: number
  /** Any CSS colour; usually a `var(--cs-*)` token. Default `currentColor`. */
  color?: string
  /** Makes the icon an image with this accessible name. Omit for decorative icons. */
  title?: string
  className?: string
}

export function Icon({ name, size = 12, color = 'currentColor', title, className }: IconProps) {
  const { viewBox, shapes } = ICONS[name]
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      className={className}
      style={{ flex: 'none', display: 'block' }}
      {...(title ? { role: 'img' } : { 'aria-hidden': true })}
    >
      {title ? <title>{title}</title> : null}
      {shapes.map((shape, i) =>
        shape.kind === 'rect' ? (
          <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} fill={color} />
        ) : (
          <path
            key={i}
            d={shape.d}
            fill={shape.fill ? color : 'none'}
            stroke={shape.fill ? undefined : color}
            strokeWidth={shape.fill ? undefined : shape.strokeWidth}
            strokeDasharray={shape.dash}
            strokeLinecap={shape.round ? 'round' : undefined}
            strokeLinejoin={shape.round ? 'round' : undefined}
          />
        ),
      )}
    </svg>
  )
}
