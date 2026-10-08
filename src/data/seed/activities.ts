import type { Activity } from '../types'
import { agents } from './agents'

/** Job names for single-activity agents (from privilege titles in the frames where they exist). */
const JOBS: Record<string, string> = {
  'renal-dosing': 'Adjust antibiotic doses for kidney function',
  'duplicate-rx': 'Flag duplicate therapy',
  'formulary-swap': 'Suggest formulary alternatives',
  'allergy-recon': 'Reconcile allergy lists',
  'antibiotic-stop': 'Flag antibiotic stop dates',
  'discharge-meds': 'Draft discharge med list',
  'drug-interaction': 'Flag drug interactions',
  'infusion-rate': 'Check infusion rates',
  'med-history': 'Draft medication history',
  'med-shortage': 'Suggest substitutes for shortages',
  'pharmacy-note': 'Draft pharmacy progress notes',
  'prn-review': 'Review PRN use',
  'tpn-draft': 'Draft TPN orders for review',
  'vaccine-history': 'Reconcile vaccine history',
  'warfarin-check': 'Check warfarin dosing against INR',
  'controlled-drug': 'Reconcile controlled-drug counts',
  'iv-to-oral': 'Suggest IV-to-oral switch',
  'pediatric-dose': 'Check pediatric weight-based doses',
  'opioid-taper': 'Draft opioid taper plans',
}

const medRec: Activity[] = [
  {
    id: 'med-rec-admission',
    agentId: 'med-rec',
    name: 'Reconcile home medications at admission',
    level: 'draft',
    reviewLevel: 'normal',
    branches: [],
    today: '96 drafts',
  },
  {
    id: 'med-rec-allergy',
    agentId: 'med-rec',
    name: 'Flag allergy conflicts',
    level: 'shadow',
    reviewLevel: 'normal',
    branches: [],
    today: '41 in shadow',
  },
]

/** Discharge Meds Agent's second activity (division view 4b). */
const dischargeInteractions: Activity = {
  id: 'discharge-meds-interactions',
  agentId: 'discharge-meds',
  name: 'Flag discharge interactions',
  level: 'shadow',
  reviewLevel: 'normal',
  branches: [],
}

/** One activity per agent (id = agent id), except Med Rec Agent's two. */
export const activities: Activity[] = [
  ...medRec,
  ...agents
    .filter((a) => a.id !== 'med-rec')
    .flatMap((a): Activity[] => [
      {
        id: a.id,
        agentId: a.id,
        name: JOBS[a.id] ?? a.name.replace(/ Agent$/, ''),
        level: a.level,
        reviewLevel: 'normal' as const,
        branches:
        a.id === 'allergy-recon'
          ? [{ id: 'outside-records', name: 'Add an allergy from outside records', favourable: true }]
          : [],
      },
      ...(a.id === 'discharge-meds' ? [dischargeInteractions] : []),
    ]),
]
