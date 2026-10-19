'use client'

import { useState } from 'react'
import { KnowledgeItem, Lead } from '@/lib/crm-data'
import { LEAD_STATUS_LABEL } from '@/lib/labels'

interface KnowledgeTableProps {
  knowledgeItems: KnowledgeItem[]
  leads: Lead[]
  onSelectLead: (lead: Lead) => void
  onOpenNewLeadModal: () => void
}

export default function KnowledgeTable({
  knowledgeItems,
  leads,
  onSelectLead,
  onOpenNewLeadModal,
}: KnowledgeTableProps) {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'leads'>('leads')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLeads = leads.filter(
    (l) =>
      l.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredKnowledge = knowledgeItems.filter((k) =>
    k.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div
      style={{
        backgroundColor: 'var(--white)',
        border: 'var(--border-width) solid var(--color-divider)',
        borderRadius: 'var(--radius-surface)',
        padding: 'var(--space-4)',
        boxShadow: '0 4px 20px rgba(16, 24, 21, 0.04)',
      }}
    >
      {/* Header and Tab Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
          borderBottom: 'var(--border-width) solid var(--color-divider)',
          paddingBottom: 'var(--space-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            style={{
              background: activeTab === 'leads' ? 'var(--massar-green)' : 'transparent',
              color: activeTab === 'leads' ? 'var(--white)' : 'var(--color-text)',
              border: 'none',
              borderRadius: 'var(--radius-control)',
              padding: '6px 14px',
              fontSize: 'var(--text-label)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--motion-fast) var(--motion-ease)',
            }}
          >
            Active Leads & Cases ({leads.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('knowledge')}
            style={{
              background: activeTab === 'knowledge' ? 'var(--massar-green)' : 'transparent',
              color: activeTab === 'knowledge' ? 'var(--white)' : 'var(--color-text)',
              border: 'none',
              borderRadius: 'var(--radius-control)',
              padding: '6px 14px',
              fontSize: 'var(--text-label)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--motion-fast) var(--motion-ease)',
            }}
          >
            Suggested Knowledge ({knowledgeItems.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search by client name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-control)',
              border: 'var(--border-width) solid var(--color-divider)',
              fontSize: 'var(--text-label)',
              backgroundColor: 'var(--bone)',
              color: 'var(--ink)',
              minWidth: '220px',
            }}
          />
          {activeTab === 'leads' && (
            <button
              type="button"
              onClick={onOpenNewLeadModal}
              style={{
                backgroundColor: 'var(--massar-green)',
                color: 'var(--white)',
                border: 'none',
                borderRadius: 'var(--radius-control)',
                padding: '6px 14px',
                fontSize: 'var(--text-label)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + New Lead
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="massar-table-wrap" style={{ overflowX: 'auto' }}>
        {activeTab === 'leads' ? (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 'var(--text-label)',
              textAlign: 'start',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid var(--massar-green)' }}>
                <th style={{ padding: '8px', textAlign: 'start', color: 'var(--massar-green)', fontSize: '11px', textTransform: 'uppercase' }}>
                  Client / Lead Name
                </th>
                <th style={{ padding: '8px', textAlign: 'start', color: 'var(--massar-green)', fontSize: '11px', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '8px', textAlign: 'start', color: 'var(--massar-green)', fontSize: '11px', textTransform: 'uppercase' }}>
                  Journey Stage
                </th>
                <th style={{ padding: '8px', textAlign: 'start', color: 'var(--massar-green)', fontSize: '11px', textTransform: 'uppercase' }}>
                  Assigned Owner
                </th>
                <th style={{ padding: '8px', textAlign: 'start', color: 'var(--massar-green)', fontSize: '11px', textTransform: 'uppercase' }}>
                  Next Cairo Deadline
                </th>
                <th style={{ padding: '8px', textAlign: 'end', color: 'var(--massar-green)', fontSize: '11px', textTransform: 'uppercase' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  style={{
                    borderBottom: 'var(--border-width) solid var(--color-divider)',
                    cursor: 'pointer',
                    transition: 'background var(--motion-fast) var(--motion-ease)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bone)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{lead.fullName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text)', opacity: 0.7 }}>
                      {lead.companyName} • {lead.phone}
                    </div>
                  </td>

                  <td style={{ padding: '12px 8px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor:
                          lead.status === 'converted'
                            ? 'rgba(13, 59, 52, 0.15)'
                            : lead.status === 'qualified'
                            ? 'rgba(184, 83, 51, 0.15)'
                            : 'var(--bone)',
                        color:
                          lead.status === 'converted'
                            ? 'var(--massar-green)'
                            : lead.status === 'qualified'
                            ? 'var(--clay)'
                            : 'var(--color-text)',
                        border: 'var(--border-width) solid var(--color-divider)',
                      }}
                    >
                      {LEAD_STATUS_LABEL[lead.status] || lead.status}
                    </span>
                  </td>

                  <td style={{ padding: '12px 8px' }}>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 500,
                        color: 'var(--massar-green)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {lead.journeyStage}
                    </span>
                  </td>

                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--massar-green)',
                          color: 'var(--white)',
                          fontSize: '10px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {lead.assigneeAvatar}
                      </span>
                      <span style={{ fontSize: '12px' }}>{lead.assigneeName}</span>
                    </div>
                  </td>

                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-text)' }}>
                      {lead.nextActionTitle}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--clay)', fontWeight: 600 }}>
                      Cairo Due: {new Date(lead.nextActionDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  <td style={{ padding: '12px 8px', textAlign: 'end' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectLead(lead)
                      }}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: 'transparent',
                        color: 'var(--massar-green)',
                        border: 'var(--border-width) solid var(--massar-green)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Open Case
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 'var(--text-label)',
              textAlign: 'start',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid var(--massar-green)' }}>
                <th style={{ padding: '8px', textAlign: 'start', color: 'var(--massar-green)', fontSize: '11px', textTransform: 'uppercase' }}>
                  Subject
                </th>
                <th style={{ padding: '8px', textAlign: 'start', color: 'var(--massar-green)', fontSize: '11px', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '8px', textAlign: 'start', color: 'var(--massar-green)', fontSize: '11px', textTransform: 'uppercase' }}>
                  Start Date
                </th>
                <th style={{ padding: '8px', textAlign: 'start', color: 'var(--massar-green)', fontSize: '11px', textTransform: 'uppercase' }}>
                  End Date
                </th>
                <th style={{ padding: '8px', textAlign: 'start', color: 'var(--massar-green)', fontSize: '11px', textTransform: 'uppercase' }}>
                  Assigned User
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredKnowledge.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: 'var(--border-width) solid var(--color-divider)',
                  }}
                >
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.subject}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text)', opacity: 0.7 }}>
                      {item.category}
                    </div>
                  </td>

                  <td style={{ padding: '12px 8px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor:
                          item.status === 'executed'
                            ? 'var(--massar-green)'
                            : item.status === 'in_progress'
                            ? 'var(--clay)'
                            : 'var(--stone)',
                        color: 'var(--white)',
                      }}
                    >
                      {item.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>

                  <td style={{ padding: '12px 8px', fontSize: '12px' }}>{item.startDate}</td>
                  <td style={{ padding: '12px 8px', fontSize: '12px' }}>{item.endDate}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '12px' }}>{item.assignedUser}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-text)', opacity: 0.7 }}>
                      {item.assignedRole}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
