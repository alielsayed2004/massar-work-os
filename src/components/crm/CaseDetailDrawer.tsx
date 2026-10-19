'use client'

import { useState } from 'react'
import { Lead, TeamMember, JourneyStage, LeadStatus } from '@/lib/crm-data'
import { LEAD_STATUS_LABEL, JOURNEY_STAGE_LABEL } from '@/lib/labels'

interface CaseDetailDrawerProps {
  lead: Lead | null
  onClose: () => void
  teamMembers: TeamMember[]
  onUpdateLead: (updated: Lead) => void
}

export default function CaseDetailDrawer({
  lead,
  onClose,
  teamMembers,
  onUpdateLead,
}: CaseDetailDrawerProps) {
  const [currentStage, setCurrentStage] = useState<JourneyStage>(lead?.journeyStage || 'awareness')
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>(lead?.status || 'new')
  const [assigneeId, setAssigneeId] = useState<string>(lead?.assigneeId || '')
  const [interactionNote, setInteractionNote] = useState('')
  const [interactionChannel, setInteractionChannel] = useState('Call')
  const [nextActionTitle, setNextActionTitle] = useState(lead?.nextActionTitle || '')
  const [interactionsLog, setInteractionsLog] = useState<
    { date: string; channel: string; note: string; user: string }[]
  >([
    {
      date: '2026-10-17 14:30',
      channel: 'WhatsApp',
      note: 'Initial pitch presentation and SLA deck sent; weekly sync scheduled.',
      user: lead?.assigneeName || 'Sarah Mansour',
    },
    {
      date: '2026-10-16 11:15',
      channel: 'Call',
      note: 'Discovery calibration call completed to understand requirements and target timeline.',
      user: lead?.assigneeName || 'Sarah Mansour',
    },
  ])

  if (!lead) return null

  const handleSave = () => {
    const assignedMember = teamMembers.find((m) => m.id === assigneeId) || {
      id: lead.assigneeId,
      name: lead.assigneeName,
      role: lead.assigneeRole,
      avatar: lead.assigneeAvatar,
    }

    const updated: Lead = {
      ...lead,
      journeyStage: currentStage,
      status: currentStatus,
      assigneeId: assignedMember.id,
      assigneeName: assignedMember.name,
      assigneeRole: assignedMember.role,
      assigneeAvatar: assignedMember.avatar,
      nextActionTitle: nextActionTitle || lead.nextActionTitle,
    }

    onUpdateLead(updated)
    onClose()
  }

  const handleAddInteraction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!interactionNote.trim()) return

    const newLog = {
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      channel: interactionChannel,
      note: interactionNote.trim(),
      user: lead.assigneeName,
    }

    setInteractionsLog([newLog, ...interactionsLog])
    setInteractionNote('')
  }

  const stages: JourneyStage[] = [
    'awareness',
    'consideration',
    'purchase',
    'onboarding',
    'retention',
    'support',
    'advocacy',
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(16, 24, 21, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--white)',
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          overflowY: 'auto',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          borderInlineStart: 'var(--border-width) solid var(--color-divider)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-4)',
            backgroundColor: 'var(--bone)',
            borderBottom: 'var(--border-width) solid var(--color-divider)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: 'var(--massar-green)',
                  color: 'var(--white)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                Case #{lead.id}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--clay)', fontWeight: 600 }}>
                {lead.segment}
              </span>
            </div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--color-text)',
                margin: '6px 0 2px',
                fontFamily: 'var(--font-serif)',
              }}
            >
              {lead.companyName}
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text)', opacity: 0.85 }}>
              Contact: {lead.fullName} • {lead.phone}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Journey Stage Progression Bar (SOP §8) */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '8px' }}>
              Customer Journey Stage (SOP §8)
            </label>
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
              {stages.map((st, idx) => {
                const isCurrent = currentStage === st
                const isPassed = stages.indexOf(currentStage) >= idx
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCurrentStage(st)}
                    style={{
                      flex: 1,
                      minWidth: '80px',
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-control)',
                      backgroundColor: isCurrent
                        ? 'var(--massar-green)'
                        : isPassed
                        ? 'rgba(13, 59, 52, 0.15)'
                        : 'var(--bone)',
                      color: isCurrent ? 'var(--white)' : 'var(--color-text)',
                      border: isCurrent
                        ? 'none'
                        : 'var(--border-width) solid var(--color-divider)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                      textTransform: 'capitalize',
                      transition: 'all var(--motion-fast) var(--motion-ease)',
                    }}
                  >
                    {idx + 1}. {st}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-text)', opacity: 0.7, margin: '6px 0 0' }}>
              Current stage: <strong>{JOURNEY_STAGE_LABEL[currentStage]}</strong>. Advance stage only when transition gate criteria are verified.
            </p>
          </div>

          {/* Operational Status & Assignee (SOP §7) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
                Operational Status (SOP §4)
              </label>
              <select
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value as LeadStatus)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-control)',
                  border: 'var(--border-width) solid var(--color-border-strong)',
                  fontSize: '12px',
                  backgroundColor: 'var(--white)',
                }}
              >
                {Object.entries(LEAD_STATUS_LABEL).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
                Account Lead (SOP §7)
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-control)',
                  border: 'var(--border-width) solid var(--color-border-strong)',
                  fontSize: '12px',
                  backgroundColor: 'var(--white)',
                }}
              >
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.activeCases} active)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Next Action Task (SOP §9) */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
              Next Scheduled Action Item (SOP §9)
            </label>
            <input
              type="text"
              value={nextActionTitle}
              onChange={(e) => setNextActionTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-control)',
                border: 'var(--border-width) solid var(--color-border-strong)',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Log New Interaction (SOP §7) */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--bone)',
              borderRadius: 'var(--radius-control)',
              border: 'var(--border-width) solid var(--color-divider)',
            }}
          >
            <h4
              style={{
                margin: '0 0 8px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--massar-green)',
              }}
            >
              Log Customer Interaction (SOP §7)
            </h4>
            <form onSubmit={handleAddInteraction} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={interactionChannel}
                  onChange={(e) => setInteractionChannel(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-control)',
                    border: 'var(--border-width) solid var(--color-border-strong)',
                    fontSize: '11px',
                    backgroundColor: 'var(--white)',
                  }}
                >
                  <option value="Call">Phone Call</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  <option value="Meeting">Meeting (In-person / Zoom)</option>
                </select>

                <input
                  type="text"
                  placeholder="Operational summary: agreed points, decisions & next milestones..."
                  value={interactionNote}
                  onChange={(e) => setInteractionNote(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-control)',
                    border: 'var(--border-width) solid var(--color-border-strong)',
                    fontSize: '11px',
                  }}
                />

                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--massar-green)',
                    color: 'var(--white)',
                    border: 'none',
                    borderRadius: 'var(--radius-control)',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Log Entry
                </button>
              </div>
            </form>
          </div>

          {/* Interactions History */}
          <div>
            <h4
              style={{
                margin: '0 0 8px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--massar-green)',
              }}
            >
              Interaction & Follow-up History
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {interactionsLog.map((log, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 10px',
                    backgroundColor: 'var(--white)',
                    borderRadius: 'var(--radius-control)',
                    border: 'var(--border-width) solid var(--color-divider)',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--massar-green)' }}>
                      [{log.channel}] {log.user}
                    </span>
                    <span style={{ color: 'var(--stone)' }}>{log.date}</span>
                  </div>
                  <div style={{ color: 'var(--color-text)', lineHeight: 1.35 }}>{log.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderTop: 'var(--border-width) solid var(--color-divider)',
            backgroundColor: 'var(--bone)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-control)',
              border: 'var(--border-width) solid var(--color-divider)',
              backgroundColor: 'transparent',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-control)',
              border: 'none',
              backgroundColor: 'var(--massar-green)',
              color: 'var(--white)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Save & Apply Changes
          </button>
        </div>
      </div>
    </div>
  )
}
