import styles from './Avatar.module.css'

export interface AvatarProps {
  initial: string
  /** Diameter in px. Default 28. */
  size?: number
}

export function Avatar({ initial, size = 28 }: AvatarProps) {
  return (
    <span className={styles.avatar} style={{ width: size, height: size }}>
      {initial}
    </span>
  )
}
