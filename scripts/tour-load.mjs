import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))

/**
 * Loads the tour script, `textHash` and the line-splitting code from the app's TypeScript source
 * through Vite, so the scripts and the app agree on all of them. Closes the dev server before
 * returning, so the process can exit.
 *
 * @returns {Promise<{
 *   CHAPTERS: import('../src/prototype/tour/types').Chapter[],
 *   textHash: (s: string) => string,
 *   splitLines: typeof import('../src/prototype/tour/split').splitLines,
 *   cutWindows: typeof import('../src/prototype/tour/split').cutWindows,
 *   RATIO_MIN: number,
 *   RATIO_MAX: number,
 * }>}
 */
export async function loadTour() {
  const server = await createServer({
    root,
    appType: 'custom',
    // No HMR socket: nothing is watching, and two runs at once would fight over its port.
    server: { middlewareMode: true, ws: false },
    logLevel: 'error',
  })
  try {
    const script = await server.ssrLoadModule('/src/prototype/tour/script.ts')
    const hash = await server.ssrLoadModule('/src/prototype/tour/hash.ts')
    const split = await server.ssrLoadModule('/src/prototype/tour/split.ts')
    return {
      CHAPTERS: script.CHAPTERS,
      textHash: hash.textHash,
      splitLines: split.splitLines,
      cutWindows: split.cutWindows,
      RATIO_MIN: split.RATIO_MIN,
      RATIO_MAX: split.RATIO_MAX,
    }
  } finally {
    await server.close()
  }
}
