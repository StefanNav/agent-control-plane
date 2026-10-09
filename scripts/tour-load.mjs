import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))

/**
 * Loads the tour script and `textHash` from the app's TypeScript source through Vite, so the scripts
 * and the app agree on both. Closes the dev server before returning, so the process can exit.
 *
 * @returns {Promise<{ CHAPTERS: import('../src/prototype/tour/types').Chapter[], textHash: (s: string) => string }>}
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
    return { CHAPTERS: script.CHAPTERS, textHash: hash.textHash }
  } finally {
    await server.close()
  }
}
