'use client'

import { useState } from 'react'
import type { Lead, TeamMember } from '@/lib/crm-data'
import { JOURNEY_STAGE_LABEL, LEAD_STATUS_LABEL, formatCairo, nowMs } from '@/lib/labels'
import { s, StatusBadge, Empty } from '@/components/ui'
import { Icon } from '@/components/icons'

export default function LeadsTable({
  leads,
  teamMembers,
  onSelectLead,
}: {
  leads: Lead[]
  teamMembers: TeamMember[]
  onSelectLead: (lead: Lead) => void
}) {
  const [query, setQuery] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [now] = useState(nowMs)

  const q = query.trim().toLowerCase()
  const visible = leads.filter(
    l =>
      (!ownerId || l.assigneeId === ownerId) &&
      (!q ||
        l.fullName.toLowerCase().includes(q) ||
        l.companyName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.includes(q))
  )

  return (
    <section className="massar-panel" aria-label="Leads">
      <div className="massar-panel-head">
        <h2 className="massar-panel-title">
          Leads <span className="massar-panel-count">{visible.length}</span>
        </h2>
        <div className="massar-btn-row">
          <div className="massar-search" style={{ width: 260 }}>
            <label htmlFor="lead-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              Search leads
            </label>
            <Icon name="search" />
            <input
              id="lead-search"
              type="search"
              placeholder="Name, company, email, phone"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <label htmlFor="lead-owner" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Owner
          </label>
          <select id="lead-owner" value={ownerId} onChange={e => setOwnerId(e.target.value)} style={{ ...s.field, width: 'auto', minHeight: 40, fontSize: 14 }}>
            <option value="">All owners</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({leads.filter(l => l.assigneeId === m.id).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <Empty>No leads match these filters.</Empty>
      ) : (
        <div className="massar-table-wrap">
          <table className="massar-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Status</th>
                <th>Stage</th>
                <th>Owner</th>
                <th>Next step</th>
                <th style={{ textAlign: 'end' }}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Action</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(lead => {
                const late = lead.isOverdue || new Date(lead.nextActionDue).getTime() < now
                return (
                  <tr key={lead.id} onClick={() => onSelectLead(lead)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="massar-cell-title">{lead.fullName}</div>
                      <div className="massar-cell-sub">{lead.companyName}</div>
                    </td>
                    <td><StatusBadge status={lead.status} label={LEAD_STATUS_LABEL[lead.status] || lead.status} /></td>
                    <td>{JOURNEY_STAGE_LABEL[lead.journeyStage] || lead.journeyStage}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span className="massar-avatar" style={{ width: 26, height: 26, fontSize: 11, background: 'var(--color-hover-strong)' }} aria-hidden="true">
                          {lead.assigneeAvatar}
                        </span>
                        {lead.assigneeName}
                      </span>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ fontSize: 14 }}>{lead.nextActionTitle}</div>
                      <div className="massar-cell-sub" style={late ? { color: 'var(--color-text)', fontWeight: 600 } : undefined}>
                        {late && <span aria-hidden="true" style={{ color: 'var(--color-attention)' }}>● </span>}
                        {late ? 'Overdue · ' : ''}<bdi>{formatCairo(lead.nextActionDue)}</bdi>
                      </div>
                    </td>
                    <td style={{ textAlign: 'end' }}>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          onSelectLead(lead)
                        }}
                        style={{ ...s.secondary, minHeight: 36, padding: '0 14px' }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
