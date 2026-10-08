import { useState, type ReactNode } from 'react'
import {
  ActionTrace,
  AgentTable,
  AutonomyLadder,
  ExceptionList,
  HardStopCard,
  InstructionCard,
  MonitorHealth,
  PauseDialog,
  PrivilegeCard,
  ResumeDialog,
  StatusChip,
  SystemsVerbsGrid,
} from '../../components'
import { Button, Card, Checkbox } from '../../design-system'
import type from '../../design-system/type.module.css'
import styles from './ComponentGallery.module.css'
import { InlineMono as M } from './InlineMono'
import {
  AGENT_ROWS,
  CHIPS,
  EXCEPTION_STATES,
  EXCEPTION_TYPES,
  GRID,
  INBOX,
  LADDER_AGENT,
  LADDER_SIGNING,
  PRIVILEGES,
  TRACE_STEPS,
} from './fixtures'

function Sub({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div className={styles.sub}>
      <h3 className={styles.subTitle}>
        <span className={type.mono}>{n}</span> {title}
      </h3>
      {children}
    </div>
  )
}

const TRACE = {
  title: 'Draft med list · encounter 4417',
  code: 'ACT-88213',
  agent: 'Med Rec Agent',
  version: 'v1.3.0',
  sop: 'v1.3',
  actingFor: 'Ana R., PharmD · 7 West',
  steps: TRACE_STEPS,
}

/** The ten product components in their component-sheet states. */
export function ProductSection() {
  const [selected, setSelected] = useState<string | null>('discharge-meds-agent')
  const [inboxSelected, setInboxSelected] = useState<string | null>('i3')
  const [pauseOpen, setPauseOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [scope, setScope] = useState<'activity' | 'agent' | 'division'>('agent')
  const [pauseReason, setPauseReason] = useState('')
  const [resumeReason, setResumeReason] = useState(
    'Wrong-patient root cause fixed in v1.3.1: encounter match is now checked before and after drafting. 20 replayed cases clean.',
  )
  const [grid, setGrid] = useState(GRID)

  return (
    <section className={styles.section}>
      <h2 className={type.label}>Product components</h2>

      <Sub n="01" title="Status chip">
        <Card>
          <div className={styles.chipRows}>
            {CHIPS.map((chip) => (
              <div key={chip.status} className={styles.chipRow}>
                <StatusChip status={chip.status} label={chip.label} />
                <StatusChip status={chip.status} label={chip.label} size="comfortable" />
                <span className={type.meta}>{chip.note}</span>
              </div>
            ))}
          </div>
        </Card>
      </Sub>

      <Sub n="02" title="Agent row">
        <AgentTable ariaLabel="Agent row states" rows={AGENT_ROWS} selectedId={selected} onSelect={setSelected} />
      </Sub>

      <Sub n="03" title="Exception item">
        <ExceptionList ariaLabel="Exception types" showHeader groups={EXCEPTION_TYPES} />
        <ExceptionList ariaLabel="Exception states" groups={EXCEPTION_STATES} />
        <ExceptionList ariaLabel="Marcus's inbox" groups={INBOX} selectedId={inboxSelected} onSelect={setInboxSelected} />
      </Sub>

      <Sub n="04" title="Privilege card">
        <div className={styles.cards}>
          {PRIVILEGES.map((view) => (
            <PrivilegeCard key={view.code} view={view} onAction={() => {}} />
          ))}
        </div>
      </Sub>

      <Sub n="05" title="Autonomy ladder">
        <AutonomyLadder variant="full" steps={LADDER_SIGNING} />
        <AutonomyLadder variant="full" steps={LADDER_AGENT} />
        <div className={styles.row}>
          <AutonomyLadder variant="compact" steps={LADDER_SIGNING} />
          <AutonomyLadder variant="compact" steps={LADDER_AGENT} />
          <AutonomyLadder variant="compact" size="panel" steps={LADDER_SIGNING} />
          <AutonomyLadder variant="compact" size="panel" steps={LADDER_AGENT} />
        </div>
      </Sub>

      <Sub n="06" title="Policy vs instruction">
        <div className={styles.grid2}>
          <HardStopCard
            code="HS-04 v2"
            title="Never change a dose"
            description="Applies to every Med Rec Agent activity. If a draft changes a dose, the gateway keeps the original dose and flags the line for the pharmacist."
            rows={[
              { key: 'Owner', value: 'Sam · technical owner' },
              { key: 'Version', value: <>v2 since <M>22 Sep</M> · v1 retired</> },
              { key: 'Approved', value: <>Priya · <M>22 Sep</M></> },
              { key: 'Last 30 days', value: 'Blocked 7 of 8,912 actions' },
            ]}
            footer="The agent can't edit or talk past this rule. Changes need Priya's approval and a re-test."
          />
          <InstructionCard
            text="When the home list uses a brand name, write the generic name and keep the brand in brackets."
            rows={[
              { key: 'Owner', value: 'Marcus · agent owner' },
              { key: 'Last edited', value: <><M>01 Oct 15:22</M> · part of SOP v1.3</> },
            ]}
            onEdit={() => {}}
          />
        </div>
      </Sub>

      <Sub n="07" title="Systems and verbs">
        <SystemsVerbsGrid
          rows={grid}
          policyId="ORG-POL-02"
          note="Pharmacy worklist write is new and goes back to review."
          onToggle={(system, verb) =>
            setGrid((rows) =>
              rows.map((row) =>
                row.system === system
                  ? { ...row, cells: { ...row.cells, [verb]: row.cells[verb] === 'none' ? 'changed' : 'none' } }
                  : row,
              ),
            )
          }
        />
      </Sub>

      <Sub n="08" title="Impact preview">
        <div className={styles.row}>
          <Button onClick={() => setPauseOpen(true)}>Open pause dialog</Button>
          <Button onClick={() => setResumeOpen(true)}>Open resume request</Button>
        </div>
        <PauseDialog
          open={pauseOpen}
          agentName="Med Rec Agent"
          scopes={[
            { value: 'activity', title: 'This activity · reconcile home medications' },
            { value: 'agent', title: 'This agent · both activities' },
            { value: 'division', title: 'Every agent in Medications · 20' },
          ]}
          scope={scope}
          onScopeChange={setScope}
          effects={[
            { value: '12', lead: 'drafts in progress go back to pharmacists', text: 'They appear in the 7 West and 8 East worklists within a minute.' },
            { value: '4', lead: 'drafts waiting for review stay', text: 'Pharmacists sign or reject them as usual.' },
            { value: '~6', lead: 'admissions an hour reconciled by hand', text: 'Until the agent resumes. Charge pharmacists are told.' },
          ]}
          resumeRule={{
            lead: 'Resuming needs Priya and you,',
            text: 'both with a reason. Each activity returns to the level it had.',
          }}
          reason={pauseReason}
          onReasonChange={setPauseReason}
          audit="Logs Marcus · 09:47"
          onCancel={() => setPauseOpen(false)}
          onConfirm={() => setPauseOpen(false)}
        />
        <ResumeDialog
          open={resumeOpen}
          mode="request"
          agentName="Med Rec Agent"
          pausedBy="Marcus"
          pausedAt="09:47"
          pausedAgo="2 h 14 min ago"
          needs={[
            { name: 'Marcus · agent owner', status: 'requesting now', done: true },
            { name: 'Priya · clinical sponsor', status: 'approval pending', done: false },
          ]}
          returnsTo={[
            { activity: 'Reconcile home medications', level: 'Draft' },
            { activity: 'Flag allergy conflicts', level: 'Draft' },
          ]}
          reason={resumeReason}
          onReasonChange={setResumeReason}
          statusLine="Stays paused until Priya approves"
          onCancel={() => setResumeOpen(false)}
          onSubmit={() => setResumeOpen(false)}
        />
      </Sub>

      <Sub n="09" title="Action trace">
        <ActionTrace view={TRACE} onExport={() => {}} />
      </Sub>

      <Sub n="10" title="Monitor health">
        <div className={styles.row}>
          <MonitorHealth state="live" at="09:42:17" />
          <MonitorHealth state="delayed" at="09:36" delayMin={6} />
          <MonitorHealth state="stale" at="06:41" staleFor="3h" />
        </div>
      </Sub>
    </section>
  )
}

/** The sheet's dark section: the same components on dark tokens (wall display). */
export function DarkSection() {
  const [selected, setSelected] = useState<string | null>('discharge-meds-agent')
  return (
    <section className={styles.section}>
      <h2 className={type.label}>Dark</h2>
      <div className={styles.darkPanel} data-theme="dark">
        <div className={styles.chipRow}>
          {CHIPS.map((chip) => (
            <StatusChip key={chip.status} status={chip.status} label={chip.label} />
          ))}
        </div>
        <AgentTable ariaLabel="Agent rows, dark" rows={AGENT_ROWS.slice(2, 10)} selectedId={selected} onSelect={setSelected} />
        <ExceptionList ariaLabel="Inbox, dark" groups={INBOX} />
        <div className={styles.row}>
          <Button variant="primary">Pause agent</Button>
          <Button>Cancel</Button>
          <Checkbox checked onChange={() => {}} label="Tested" />
          <MonitorHealth state="live" at="09:42:17" />
        </div>
      </div>
    </section>
  )
}
