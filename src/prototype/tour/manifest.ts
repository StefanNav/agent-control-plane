import manifest from './manifest.json'
import type { Manifest } from './types'

/** Clip lengths by beat id. Written by `pnpm tour:audio`; read here so the engine can time the tour. */
export const MANIFEST: Manifest = manifest as Manifest

/** Where a beat's clip is served from. */
export function clipUrl(beatId: string): string {
  return `/tour/audio/${beatId}.m4a`
}
