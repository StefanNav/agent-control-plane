import { useState, type ReactNode } from 'react'
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  DefinitionList,
  Field,
  FilterPill,
  Icon,
  Input,
  LogRow,
  Menu,
  Modal,
  Notice,
  Paper,
  ProgressBar,
  RadioCardGroup,
  RuleTag,
  Segmented,
  Select,
  Sparkline,
  StatStrip,
  Table,
  Tabs,
  Textarea,
  WizardSteps,
  type Column,
  type IconName,
} from '../../design-system'
import type from '../../design-system/type.module.css'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { Body } from '../../layout/layouts'
import styles from './ComponentGallery.module.css'
import { DarkSection, ProductSection } from './ProductSection'

const TOKENS = [
  'bg', 'raised', 'sunk', 'hover', 'fill', 'sel', 'acc', 'acc-fill', 'line', 'line-strong', 'off', 'icon',
  'meta', 'text2', 'strong', 'ink', 'rev', 'warn', 'warn-text', 'crit', 'lad-pass', 'lad-lock',
]

const ICONS: Array<[IconName, string, string]> = [
  ['ring', 'Review', 'var(--cs-rev)'],
  ['diamond', 'Warning', 'var(--cs-warn)'],
  ['triangle', 'Critical', 'var(--cs-crit)'],
  ['stale', 'Monitor stale', 'var(--cs-meta)'],
  ['shadow', 'Shadow', 'var(--cs-icon)'],
  ['paused', 'Paused', 'var(--cs-icon)'],
  ['check', 'Check', 'var(--cs-meta)'],
  ['lock', 'Lock', 'var(--cs-meta)'],
  ['chevron', 'Chevron', 'var(--cs-meta)'],
]

interface AgentRowData {
  id: string
  name: string
  version: string
  day: number
  signed: string
}

const AGENTS: AgentRowData[] = [
  { id: 'med-rec', name: 'Med Rec Agent', version: 'v1.3.0', day: 147, signed: '82%' },
  { id: 'renal', name: 'Renal Dosing Agent', version: 'v2.0.1', day: 63, signed: '71%' },
  { id: 'formulary', name: 'Formulary Swap Agent', version: 'v1.1.0', day: 0, signed: '—' },
]

const AGENT_COLUMNS: Column<AgentRowData>[] = [
  {
    id: 'agent',
    header: 'Agent',
    width: 'minmax(0, 1fr)',
    render: (row) => (
      <>
        <span>{row.name}</span>
        <span className={type.mono}>{row.version}</span>
      </>
    ),
  },
  { id: 'day', header: '24h', width: '56px', align: 'right', render: (row) => row.day },
  { id: 'signed', header: 'Signed as is', width: '96px', align: 'right', render: (row) => row.signed },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={type.label}>{title}</h2>
      {children}
    </section>
  )
}

function Swatches() {
  return (
    <div className={styles.swatches}>
      {TOKENS.map((token) => (
        <div key={token} className={styles.swatch}>
          <span className={styles.chip} style={{ background: `var(--cs-${token})` }} />
          <span className={type.mono}>--cs-{token}</span>
        </div>
      ))}
    </div>
  )
}

export function ComponentGallery() {
  const [checked, setChecked] = useState(true)
  const [scope, setScope] = useState<'activity' | 'agent' | 'division'>('agent')
  const [level, setLevel] = useState<'shadow' | 'draft'>('draft')
  const [inboxView, setInboxView] = useState<'needs-me' | 'digest' | 'log'>('needs-me')
  const [blockedOnly, setBlockedOnly] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>('med-rec')
  const [tab, setTab] = useState('overview')
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <PageHeader
        breadcrumb="About / Components"
        title="Countersign components"
        sub="The design-system primitives and the ten product components every screen is built from, in their states, light and dark."
      />
      <Body>
        <Section title="Tokens">
          <div className={styles.themes}>
            <div className={styles.panel}>
              <Swatches />
            </div>
            <div className={styles.panel} data-theme="dark">
              <Swatches />
            </div>
          </div>
        </Section>

        <Section title="Type">
          <Card>
            <div className={styles.stack}>
              <span className={type.pageTitle}>Page title · 24/32</span>
              <span className={type.statValue}>Stat value · 20/28</span>
              <span className={type.sectionTitle}>Section title · 18/24</span>
              <span className={type.body}>Form body · 16/24</span>
              <span className={type.ui}>UI text · 14/20</span>
              <span className={type.dense}>Dense tables and boards · 13/18</span>
              <span className={type.meta}>Meta · 12/16</span>
              <span className={type.mono}>PRV-0142 v3 · 09:38:04.512</span>
              <span className={type.label}>Label · mono uppercase</span>
            </div>
          </Card>
        </Section>

        <Section title="Icons">
          <div className={styles.row}>
            {ICONS.map(([name, label, color]) => (
              <span key={name} className={styles.iconItem}>
                <Icon name={name} color={color} size={name === 'chevron' ? 10 : 12} />
                <span className={type.dense}>{label}</span>
              </span>
            ))}
          </div>
        </Section>

        <Section title="Buttons">
          <div className={styles.row}>
            <Button variant="primary">Sign privilege</Button>
            <Button variant="secondary">Open record</Button>
            <Button variant="ghost">Edit</Button>
            <Button variant="blocked">Send to Priya</Button>
          </div>
          <div className={styles.row}>
            <Button variant="primary" size="sm">
              Review and sign
            </Button>
            <Button variant="secondary" size="sm">
              Start review
            </Button>
          </div>
        </Section>

        <Section title="Fields">
          <Paper>
            <Field label="Purpose" htmlFor="g-purpose" hint="Required" help="One sentence on what the agent is for.">
              <Input id="g-purpose" defaultValue="Prepare admission med rec drafts for pharmacist review" />
            </Field>
            <Field label="Division" htmlFor="g-division" hint="Set at intake">
              <Input id="g-division" defaultValue="Medications" locked />
            </Field>
            <Field label="Autonomy level" htmlFor="g-level">
              <Select
                id="g-level"
                value={level}
                onChange={setLevel}
                options={[
                  { value: 'shadow', label: 'Shadow' },
                  { value: 'draft', label: 'Draft' },
                ]}
              />
            </Field>
            <Field label="Reason" htmlFor="g-reason" help="Stays on the record.">
              <Textarea id="g-reason" defaultValue="Omissions target missed by one case; the cause is fixed in v1.3.1." />
            </Field>
          </Paper>
        </Section>

        <Section title="Selection">
          <div className={styles.grid2}>
            <div className={styles.stack}>
              <Checkbox checked={checked} onChange={setChecked} label="HS-11 tested" description="Would have blocked 2 of 1,180 recent cases" />
              <Checkbox checked={false} onChange={() => {}} label="Notify Priya" />
              <Checkbox checked={false} onChange={() => {}} label="Order (locked by policy)" disabled />
            </div>
            <RadioCardGroup
              name="g-scope"
              aria-label="Scope"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'activity', title: 'This activity', description: 'Reconcile home medications at admission' },
                { value: 'agent', title: 'This agent', description: 'Med Rec Agent, all activities' },
                { value: 'division', title: 'Every agent in Medications', description: 'Program lead only', disabled: true },
              ]}
            />
          </div>
          <Segmented
            value={level}
            onChange={setLevel}
            options={[
              { value: 'shadow', label: 'Shadow', sub: 'Runs, output not used' },
              { value: 'draft', label: 'Draft', sub: 'A person signs every output' },
            ]}
          />
          <div className={styles.row}>
            <Segmented
              variant="control"
              value={inboxView}
              onChange={setInboxView}
              options={[
                { value: 'needs-me', label: 'Needs me · 4' },
                { value: 'digest', label: 'Daily digest · 6' },
                { value: 'log', label: 'Log' },
              ]}
            />
            <FilterPill on={blockedOnly} onClick={() => setBlockedOnly((v) => !v)}>
              Blocked only
            </FilterPill>
            <FilterPill on={false} onClick={() => {}}>
              Today
            </FilterPill>
          </div>
        </Section>

        <Section title="Display">
          <div className={styles.grid2}>
            <Card>
              <div className={styles.cardPad}>
                <DefinitionList
                  items={[
                    { key: 'Granted by', value: 'Priya, Director of Pharmacy' },
                    { key: 'Evidence', value: 'Shadow, 412 cases, 2 of 3 targets met' },
                    { key: 'Review', value: '05 Jan' },
                  ]}
                />
              </div>
            </Card>
            <div className={styles.stack}>
              <Notice mark="warn" lead="Edit rate rising.">
                7 West edits rose from 12% to 19% this week.
              </Notice>
              <Notice mark="crit" lead="Wrong-patient draft.">
                Prior Auth Agent is paused.
              </Notice>
              <Notice mark="review" lead="Awaiting signature.">
                PRV-0142 v3 is with Priya.
              </Notice>
              <Notice mark="lock" lead="Locked by ORG-POL-02.">
                Sign and Order stay with people at every level.
              </Notice>
            </div>
          </div>
          <StatStrip
            stats={[
              { label: 'Signed as is', value: '82%', sub: 'target 80%' },
              { label: 'Edited', value: '14%', sub: '7 days' },
              { label: 'Rejected', value: '4%' },
              { label: 'Blocked', value: '3', sub: 'today' },
            ]}
          />
          <div className={styles.row}>
            <Sparkline values={[12, 14, 13, 17, 16, 19, 22]} />
            <Sparkline values={[12, 14, 13, 17, 16, 19, 22]} stale />
            <Sparkline values={[4, 6, 5, 5, 7, 6, 6]} width={56} height={16} />
            <ProgressBar value={0.62} label="Coverage" />
            <RuleTag>HS-04 v2</RuleTag>
            <RuleTag>MR-12 v1</RuleTag>
            <Avatar initial="M" />
          </div>
          <Card>
            <LogRow time="09:47" sub="Logs Marcus · reason: wrong-patient draft">
              Paused Med Rec Agent
            </LogRow>
            <LogRow time="09:52">Priya approved resume</LogRow>
          </Card>
        </Section>

        <Section title="Table">
          <Table
            ariaLabel="Agents"
            columns={AGENT_COLUMNS}
            rows={AGENTS}
            getRowId={(row) => row.id}
            selectedId={selectedAgent}
            onSelect={setSelectedAgent}
            density="board"
            groups={[{ id: 'attention', label: 'Needs a human', count: 2, rowIds: ['med-rec', 'formulary'] }]}
          />
        </Section>

        <Section title="Navigation">
          <Card>
            <div className={styles.cardPadX}>
              <Tabs
                ariaLabel="Agent sections"
                current={tab}
                onSelect={setTab}
                items={['Overview', 'Activities', 'Scorecard', 'Actions', 'Privileges', 'History'].map((label) => ({
                  id: label.toLowerCase(),
                  label,
                }))}
              />
            </div>
          </Card>
          <Card>
            <WizardSteps
              current="job"
              steps={[
                { id: 'intake', label: '1 · Intake', sub: 'Dana · done 01 Oct', mark: 'done' },
                { id: 'job', label: '2 · Job description', sub: 'Marcus · 5 of 7', mark: 'todo' },
                { id: 'systems', label: '3 · Systems and verbs', sub: 'Marcus · not started', mark: 'todo' },
                { id: 'tools', label: '4 · Tools and hard stops', sub: 'Sam · 0 of 3', mark: 'todo' },
                { id: 'approval', label: '5 · Sponsor approval', sub: 'Priya · opens when 2–4 are done', mark: 'locked' },
                { id: 'review', label: '6 · Ready for review', sub: 'AIMS Review', mark: 'review' },
              ]}
            />
          </Card>
        </Section>

        <Section title="Menu and modal">
          <div className={styles.row}>
            <Menu
              trigger={({ toggle, ref, open }) => (
                <Button ref={ref} onClick={toggle} aria-expanded={open}>
                  Controls
                  <Icon name="chevron" size={10} />
                </Button>
              )}
              groups={[
                {
                  label: 'Scope',
                  items: [
                    { id: 'pause', label: 'Pause agent', sub: '12 drafts go back to pharmacists' },
                    { id: 'shadow', label: 'Return one activity to Shadow' },
                  ],
                },
                {
                  label: 'Program lead',
                  items: [{ id: 'retire', label: 'Retire agent', sub: 'Dana only', locked: true }],
                },
              ]}
            />
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
          </div>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Pause Med Rec Agent?"
            description="Takes effect at the gateway within seconds."
            audit="Logs Marcus · 09:47"
            actions={
              <>
                <Button onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>
                  Pause agent
                </Button>
              </>
            }
          >
            <RadioCardGroup
              name="g-modal-scope"
              aria-label="Scope"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'activity', title: 'This activity' },
                { value: 'agent', title: 'This agent' },
                { value: 'division', title: 'Every agent in Medications (20)' },
              ]}
            />
            <Field label="Reason" htmlFor="g-modal-reason" hint="Optional">
              <Textarea id="g-modal-reason" />
            </Field>
          </Modal>
        </Section>

        <ProductSection />
        <DarkSection />
      </Body>
    </>
  )
}
