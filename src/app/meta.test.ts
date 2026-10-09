import indexHtml from '../../index.html?raw'
import readme from '../../README.md?raw'
import ogImage from '../../public/og.png?inline'
import { PITCH } from '../prototype/copy'

/** The page's share card, favicon and README (Phase 9 R12; Review focus 5). Read through Vite, not Node. */

const LIVE = 'https://agent-control-plane-mocha.vercel.app/'
const GENDERED = /\b(he|she|him|her|his|hers|himself|herself)\b/i
// Files that exist in the repo; lazy, so nothing is loaded.
const FILES = Object.keys(import.meta.glob(['/docs/**/*', '/designs/**/*', '/public/**/*', '/*.md']))
const exists = (path: string) => {
  const p = `/${path.replace(/^\.\//, '').replace(/\/$/, '')}`
  return FILES.some((f) => f === p || f.startsWith(`${p}/`))
}

const head = new DOMParser().parseFromString(indexHtml, 'text/html')
const meta = (selector: string) => head.querySelector(selector)?.getAttribute('content')

test('index.html carries the title, description and a share card with an absolute image', () => {
  expect(head.title).toBe('Signal · Agent Control Plane')
  expect(meta('meta[name="description"]')).toBe(PITCH)
  expect(meta('meta[property="og:title"]')).toBe('Signal · Agent Control Plane')
  expect(meta('meta[property="og:description"]')).toBe(PITCH)
  expect(meta('meta[property="og:type"]')).toBe('website')
  expect(meta('meta[property="og:url"]')).toBe(LIVE)
  expect(meta('meta[property="og:image"]')).toBe(`${LIVE}og.png`)
  expect(meta('meta[property="og:image:width"]')).toBe('1200')
  expect(meta('meta[property="og:image:height"]')).toBe('630')
  expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image')
  expect(meta('meta[name="theme-color"]')).toBeTruthy()
  expect(head.querySelector('link[rel="icon"][type="image/svg+xml"]')?.getAttribute('href')).toBe('/favicon.svg')
  expect(exists('public/favicon.svg')).toBe(true)
})

test('the share image is a 1200 × 630 PNG', () => {
  const bytes = Uint8Array.from(atob(ogImage.split(',')[1]!), (c) => c.charCodeAt(0))
  const view = new DataView(bytes.buffer)
  expect(String.fromCharCode(...bytes.subarray(1, 4))).toBe('PNG')
  expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 630])
})

test('the README presents the project: pitch, live link, no gendered pronouns, every relative link resolves', () => {
  expect(readme).toContain(PITCH)
  expect(readme).toContain(LIVE.replace(/\/$/, ''))
  expect(readme).not.toMatch(/Status: in progress/)
  expect(readme).not.toMatch(GENDERED)
  const targets = [...readme.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]!).filter((t) => !/^(https?:|mailto:|#)/.test(t))
  expect(targets.length).toBeGreaterThan(5)
  for (const target of targets) expect(exists(target.split('#')[0]!), target).toBe(true)
})
