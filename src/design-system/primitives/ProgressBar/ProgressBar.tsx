import styles from './ProgressBar.module.css'

export interface ProgressBarProps {
  /** 0..1; clamped. */
  value: number
  label?: string
  /** Track width in px. Default 56. */
  width?: number
}

export function ProgressBar({ value, label, width = 56 }: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={styles.track}
      style={{ width }}
    >
      <span className={styles.fill} style={{ width: `${percent}%` }} />
    </span>
  )
}
