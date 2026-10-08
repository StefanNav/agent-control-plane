import { useState } from 'react'
import { PauseDialog } from '../../components'
import { useDemo } from '../../store'
import { can, lockReason } from '../../store/permissions'
import { selectPausePreview, type PauseScope } from './selectors'

export interface PauseFlowProps {
  agentId: string
  agentName: string
  /** The scope chosen in the control menu; the dialog lets the person change it. */
  initialScope: PauseScope
  onClose: () => void
}

/** Pause with an impact preview (6b): pick the scope, see what happens to queued work, confirm. */
export function PauseFlow({ agentId, agentName, initialScope, onClose }: PauseFlowProps) {
  const state = useDemo((s) => s)
  const pauseAgent = useDemo((s) => s.pauseAgent)
  const [scope, setScope] = useState<PauseScope>(initialScope)
  const [reason, setReason] = useState('')
  const [refused, setRefused] = useState<string | null>(null)
  const preview = selectPausePreview(state, state.personaId, agentId, scope)
  const divisionId = state.agents.find((a) => a.id === agentId)?.divisionId
  const locked = can(state, state.personaId, 'pause', scope === 'division' ? { divisionId } : { agentId }) ? undefined : lockReason('pause', state.personaId)
  return (
    <PauseDialog
      open
      agentName={agentName}
      scopes={preview.scopes}
      scope={scope}
      onScopeChange={setScope}
      effects={preview.effects}
      resumeRule={preview.resumeRule}
      reason={reason}
      onReasonChange={setReason}
      audit={preview.audit}
      error={refused}
      locked={locked}
      onCancel={onClose}
      onConfirm={() => {
        const result = pauseAgent(agentId, { scope, reason })
        if (result.ok) onClose()
        else setRefused(result.reason)
      }}
    />
  )
}
