import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button, Checkbox, Field, Menu, Notice, Segmented, Select } from '../../design-system'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { formatDate } from '../../lib/clock'
import { useDemo } from '../../store'
import { can, lockReason } from '../../store/permissions'
import { onBoard, personName } from '../board/selectors'
import { selectExportContents } from './selectors'
import styles from './export.module.css'

/** Period choices, from go-live (06 Nov) to the demo clock. */
const PERIODS = [
  { value: 'since-live', label: '06 Nov 2026 to 08 Dec 2026', from: '2026-11-06T00:00:00' },
  { value: '30-days', label: 'Last 30 days', from: '2026-11-08T00:00:00' },
  { value: 'today', label: 'Today', from: '2026-12-08T00:00:00' },
] as const

/** Med Rec's packet outline (7d); other agents get the same sections. */
const PACKET: [string, string][] = [
  ['1', 'Agent summary and people'],
  ['3', 'Job description, v4 and changes'],
  ['7', 'Systems, tools and hard stops'],
  ['11', 'Committee decision and conditions'],
  ['13', 'Shadow scorecard and signature'],
  ['17', 'Exceptions, pauses and incident'],
  ['25', 'Action sample with traces'],
  ['—', 'Full action log in the CSV'],
]

/** Export for a surveyor (7d): built from the record as it stands, never collected by hand; the export is logged. */
export function ExportPage() {
  const [params] = useSearchParams()
  const state = useDemo((s) => s)
  const buildExport = useDemo((s) => s.buildExport)
  // Every agent with a record: on the boards, retired, or still in onboarding and AIMS Review (1h, 2c link here).
  const agents = useMemo(() => state.agents, [state.agents])
  const [agentId, setAgentId] = useState(
    agents.some((a) => a.id === params.get('agent'))
      ? params.get('agent')!
      : agents.some((a) => a.id === 'med-rec')
        ? 'med-rec'
        : (agents.find(onBoard)?.id ?? agents[0]?.id ?? ''),
  )
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['value']>('since-live')
  const [format, setFormat] = useState<'packet' | 'csv'>('packet')
  const [masked, setMasked] = useState(true)
  const [built, setBuilt] = useState<string | null>(null)
  const [refused, setRefused] = useState<string | null>(null)
  const locked = can(state, state.personaId, 'viewAudit', { agentId })
    ? undefined
    : lockReason('viewAudit', state.personaId)
  const contents = selectExportContents(state, [agentId])
  const [included, setIncluded] = useState<Record<string, boolean>>({})
  const viewer = personName(state, state.personaId)
  const build = () => {
    const from = PERIODS.find((p) => p.value === period)!.from
    const code = `EXP-${String(state.exports.length + 1).padStart(4, '0')}`
    const result = buildExport({ agentIds: [agentId], from, to: state.now, format, masked })
    if (result.ok) {
      setBuilt(code)
      setRefused(null)
    } else setRefused(result.reason)
  }
  return (
    <>
      <PageHeader
        breadcrumb="Reports / Export for surveyor"
        title="Export records"
        status="For a survey or an audit"
        actions={
          <Menu
            align="right"
            width={360}
            trigger={({ toggle, ref, open }) => (
              <Button
                ref={ref}
                variant="ghost"
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
              >
                Past exports · {state.exports.length}
              </Button>
            )}
            groups={[
              {
                label: 'Past exports',
                items: [...state.exports].reverse().map((e) => ({
                  id: e.id,
                  label: `${e.code} · ${e.agentIds.map((id) => state.agents.find((a) => a.id === id)?.name).join(', ')}`,
                  sub: `${formatDate(e.at)} · ${personName(state, e.by)} · ${e.format === 'packet' ? 'PDF packet and CSV' : 'CSV'}`,
                })),
              },
            ]}
          />
        }
      />
      <div className={styles.split}>
        <div className={styles.form} data-story-target="export-contents">
          <div className={styles.intro}>
            <h2 className={styles.title}>What to export</h2>
            <p className={styles.lead}>
              Everything comes from the record as it stands; nothing is collected by hand.
            </p>
          </div>
          <div className={styles.fields}>
            <Field label="Agents" htmlFor="export-agent">
              <Select
                id="export-agent"
                value={agentId}
                onChange={setAgentId}
                options={agents.map((a) => ({ value: a.id, label: a.name }))}
              />
            </Field>
            <Field label="Period" htmlFor="export-period">
              <Select
                id="export-period"
                value={period}
                onChange={setPeriod}
                options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
              />
            </Field>
          </div>
          <div className={styles.section}>
            <span className={styles.label}>Contents</span>
            {contents.map(([label, value]) => (
              <Checkbox
                key={label}
                checked={included[label] ?? true}
                onChange={(on) => setIncluded({ ...included, [label]: on })}
                label={label}
                description={value}
              />
            ))}
          </div>
          <div className={styles.section}>
            <span className={styles.label}>Format</span>
            <div className={styles.formats}>
              <Segmented
                aria-label="Format"
                value={format}
                onChange={setFormat}
                options={[
                  { value: 'packet', label: 'PDF packet and CSV', sub: 'For the surveyor' },
                  { value: 'csv', label: 'CSV only', sub: 'For analysis' },
                ]}
              />
            </div>
          </div>
          <Checkbox
            checked={masked}
            onChange={setMasked}
            label="Mask patient identifiers"
            description="MRNs show as ••4821; encounter numbers stay"
          />
          {refused ? (
            <Notice mark="crit" lead="Not built.">
              {refused}
            </Notice>
          ) : null}
          {built ? (
            <Notice lead={`${built} built · logged as ${viewer}.`}>
              Nothing is downloaded in this prototype; the export record is what an auditor would
              see.
            </Notice>
          ) : null}
          <div className={styles.foot}>
            <Button variant="primary" locked={locked} onClick={build}>
              Build export
            </Button>
            <span className={styles.mono}>About 2 min · logged as {viewer}</span>
          </div>
        </div>
        <aside aria-label="Packet preview" className={styles.preview}>
          <div className={styles.previewHead}>
            <span className={styles.previewTitle}>Packet preview</span>
            <span className={styles.previewSub}>
              {format === 'packet' ? 'PDF · about 46 pages' : 'CSV · one file per section'}
            </span>
          </div>
          <ol className={styles.outline}>
            {PACKET.map(([page, section]) => (
              <li key={section}>
                <span className={styles.page}>{format === 'packet' ? page : '—'}</span>
                <span>{section}</span>
              </li>
            ))}
          </ol>
          <p className={styles.previewFoot}>
            Every file carries a hash; the export itself is logged. Mapping to Joint Commission
            standards arrives with E12.
          </p>
        </aside>
      </div>
    </>
  )
}
