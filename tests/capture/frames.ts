import type { Page } from '@playwright/test'
import type { PersonaId } from '../../src/data/types'

/** One designed frame and how to reach its state in the app (spec §8, §6.3; each phase's e2e). */
export interface FrameShot {
  frame: string
  /** Design file in `designs/`. */
  file: string
  /** Route, with `?scenario=` for the frame's moment. */
  url: string
  persona?: PersonaId
  /** Opens what the frame shows open. */
  act?: (page: Page) => Promise<void>
}

const E1 = 'E1 Onboarding Countersign.dc.html'
const E2 = 'E2 Humans and Review.dc.html'
const E3 = 'E3 Shadow and Go Live.dc.html'
const E4 = 'E4 Command Board.dc.html'
const E5 = 'E5 Exception Inbox.dc.html'
const E6 = 'E6 Stop and Resume.dc.html'
const E7 = 'E7 Replay and Audit.dc.html'
const E8 = 'E8 Divisions and Access.dc.html'
const E9 = 'E9 Changes and Unregistered.dc.html'
const ONB = '/inventory/agents/med-rec/onboarding'
const AGENT = '/operations/agents/med-rec'

const openControls = async (page: Page) => {
  await page.getByRole('button', { name: 'Controls' }).click()
}

export const FRAMES: FrameShot[] = [
  { frame: '4a', file: E4, url: '/operations', persona: 'dana' },
  { frame: '4e', file: E4, url: '/wall' },
  { frame: '4b', file: E4, url: '/operations/divisions/medications?agent=discharge-meds', persona: 'marcus' },
  { frame: '4c', file: E4, url: AGENT, persona: 'marcus' },
  { frame: '4d', file: E4, url: '/operations?view=tiles', persona: 'dana' },
  { frame: '4f', file: E4, url: '/operations?view=exceptions', persona: 'dana' },
  { frame: '5a', file: E5, url: '/operations/inbox/exc-5512', persona: 'marcus' },
  {
    frame: '5b',
    file: E5,
    url: '/operations/inbox/exc-5512',
    persona: 'marcus',
    act: async (page) => page.getByRole('button', { name: 'Dismiss…' }).click(),
  },
  { frame: '5c', file: E5, url: '/operations/inbox?view=digest', persona: 'marcus' },
  { frame: '5d', file: E5, url: '/operations/inbox/exc-5508?scenario=stale-escalated', persona: 'priya' },
  { frame: '6a', file: E6, url: AGENT, persona: 'marcus', act: openControls },
  { frame: '6b', file: E6, url: `${AGENT}?control=pause-agent`, persona: 'marcus' },
  { frame: '6c', file: E6, url: `${AGENT}?control=shadow`, persona: 'sam' },
  { frame: '6d', file: E6, url: `${AGENT}?scenario=resume-requested`, persona: 'marcus' },
  { frame: '6e', file: E6, url: `${AGENT}?scenario=resume-requested`, persona: 'priya' },
  {
    frame: '6f',
    file: E6,
    url: '/inventory',
    persona: 'dana',
    act: async (page) => {
      await page.getByRole('table', { name: 'Agents' }).getByText('IV-to-Oral Agent').click()
      await page.getByRole('complementary', { name: 'Selected record' }).getByRole('button', { name: 'Disable or retire…' }).click()
    },
  },
  { frame: '7a', file: E7, url: '/operations/actions?agent=med-rec&policy=blocked', persona: 'jordan' },
  { frame: '7b', file: E7, url: '/operations/actions/act-88213', persona: 'jordan' },
  { frame: '7c', file: E7, url: '/operations/incidents/inc-0031?scenario=resume-requested', persona: 'jordan' },
  { frame: '7d', file: E7, url: '/reports/export?agent=med-rec', persona: 'dana' },
  { frame: '8c', file: E8, url: '/inventory?agent=med-rec', persona: 'dana' },
  { frame: '1a', file: E1, url: `${ONB}/intake?scenario=onboarding-intake`, persona: 'dana' },
  { frame: '1b', file: E1, url: `${ONB}/job?scenario=onboarding-at-5-of-7`, persona: 'marcus' },
  { frame: '1c', file: E1, url: `${ONB}/systems?scenario=onboarding-systems`, persona: 'marcus' },
  { frame: '1d', file: E1, url: `${ONB}/tools?scenario=onboarding-tools-tested`, persona: 'sam' },
  { frame: '1e', file: E1, url: `${ONB}/approval?scenario=onboarding-sponsor-review`, persona: 'priya' },
  {
    frame: '1f',
    file: E1,
    url: `${ONB}/approval?scenario=onboarding-sponsor-review`,
    persona: 'priya',
    act: async (page) => {
      await page.getByRole('button', { name: /HS-11 v1/ }).click()
      await page.getByRole('button', { name: 'Request changes' }).click()
    },
  },
  { frame: '1g', file: E1, url: `${ONB}/tools?scenario=onboarding-returned-hs11`, persona: 'sam' },
  { frame: '1h', file: E1, url: `${ONB}/review?scenario=onboarding-ready`, persona: 'priya' },
  { frame: '1i', file: E1, url: '/inventory?tab=drafts&scenario=onboarding-at-5-of-7', persona: 'marcus' },
  { frame: '2a', file: E2, url: `${ONB}/intake?scenario=onboarding-intake`, persona: 'dana' },
  { frame: '2b', file: E2, url: '/inventory/agents/med-rec/risk-tier?scenario=review-risk-tier', persona: 'dana' },
  { frame: '2c', file: E2, url: '/portfolio/reviews/med-rec?scenario=review-committee', persona: 'drlee' },
  { frame: '2d', file: E2, url: '/inventory/agents/med-rec?scenario=review-decided', persona: 'dana' },
  { frame: '3a', file: E3, url: `${AGENT}?tab=scorecard&scenario=shadow-day-21`, persona: 'marcus' },
  { frame: '3b', file: E3, url: `${AGENT}/cases/enc-4105?scenario=shadow-day-21`, persona: 'marcus' },
  { frame: '3c', file: E3, url: '/inventory/privileges/prv-0142/sign?scenario=awaiting-signature', persona: 'priya' },
  { frame: '3d', file: E3, url: '/portfolio/privileges', persona: 'priya' },
  { frame: '8a', file: E8, url: '/settings/divisions/medications', persona: 'dana' },
  { frame: '8b', file: E8, url: '/settings/people?person=sam', persona: 'dana' },
  { frame: '9a', file: E9, url: `${AGENT}?tab=changes&scenario=change-detected-v150`, persona: 'marcus' },
  { frame: '9b', file: E9, url: '/inventory/unregistered/svc-dc-summary-bot', persona: 'dana' },
  {
    frame: '10a',
    file: 'E10 Clinician Feedback.dc.html',
    url: '/epic',
    persona: 'ana',
    act: async (page) => page.getByRole('button', { name: 'Flag a problem' }).click(),
  },
  { frame: '10b', file: 'E10 Clinician Feedback.dc.html', url: '/epic?day=later', persona: 'ana' },
  { frame: '11a', file: 'E11 Reviewer Behaviour.dc.html', url: '/operations/reviewers', persona: 'marcus' },
  { frame: '11b', file: 'E11 Reviewer Behaviour.dc.html', url: '/operations/reviewers/6-north', persona: 'marcus' },
  { frame: '12a', file: 'E12 RUAIH Evidence.dc.html', url: '/reports/evidence', persona: 'dana' },
  { frame: '12b', file: 'E12 RUAIH Evidence.dc.html', url: '/reports/evidence/med-rec?export=1', persona: 'dana' },
  { frame: '13a', file: 'E13 Review Levels.dc.html', url: '/portfolio/activities/allergy-recon', persona: 'priya' },
  { frame: '13b', file: 'E13 Review Levels.dc.html', url: '/operations/sampling', persona: 'marcus' },
  { frame: '14a', file: 'E14 Promote to Supervised.dc.html', url: '/inventory/promotions/prm-0007', persona: 'priya' },
  {
    frame: '14b',
    file: 'E14 Promote to Supervised.dc.html',
    url: '/portfolio/promotions/prm-0007?scenario=promotion-at-board',
    persona: 'drlee',
  },
  { frame: '15a', file: 'E15 Step Down.dc.html', url: `${AGENT}?scenario=step-down-threshold`, persona: 'priya' },
  {
    frame: '15b',
    file: 'E15 Step Down.dc.html',
    url: '/portfolio/activities/allergy-recon/branches/outside-records?scenario=step-down-version',
    persona: 'priya',
  },
]
