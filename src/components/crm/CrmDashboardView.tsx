'use client'

import { useState } from 'react'
import { Lead, TeamMember, INITIAL_LEADS, INITIAL_TEAM_MEMBERS } from '@/lib/crm-data'
import { s, PageHeader, StatStrip } from '@/components/ui'
import { Icon } from '@/components/icons'
import { nowMs } from '@/lib/labels'
import LeadsTable from './LeadsTable'
import JourneyFlowchartCanvas from './JourneyFlowchartCanvas'
import DailyCloseChecklist from './DailyCloseChecklist'
import NewLeadModal from './NewLeadModal'
import CaseDetailDrawer from './CaseDetailDrawer'

type Tab = 'leads' | 'journey' | 'closing'

interface CrmDashboardViewProps {
  initialLeads?: Lead[]
  initialTeamMembers?: TeamMember[]
}

export default function CrmDashboardView({
  initialLeads = INITIAL_LEADS,
  initialTeamMembers = INITIAL_TEAM_MEMBERS,
}: CrmDashboardViewProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [teamMembers] = useState<TeamMember[]>(initialTeamMembers)
  const [tab, setTab] = useState<Tab>('leads')
  const [activeLead, setActiveLead] = useState<Lead | null>(leads[0] || null)
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null)
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false)
  const [now] = useState(nowMs)

  const handleCreateLead = (newLead: Lead) => {
    setLeads([newLead, ...leads])
    setActiveLead(newLead)
  }

  const handleUpdateLead = (updated: Lead) => {
    setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)))
    if (activeLead?.id === updated.id) setActiveLead(updated)
  }

  const openLead = (lead: Lead) => {
    setActiveLead(lead)
    setDrawerLead(lead)
  }

  const open = leads.filter(l => l.status !== 'converted' && l.status !== 'closed')
  const overdue = open.filter(l => l.isOverdue || new Date(l.nextActionDue).getTime() < now)

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'leads', label: 'Leads', count: leads.length },
    { key: 'journey', label: 'Journey' },
    { key: 'closing', label: 'Daily close' },
  ]

  return (
    <div>
      <PageHeader
        title="Leads & Journeys"
        description="New business from first contact to onboarding. Every lead has one owner and a next step with a Cairo deadline."
        actions={
          <button type="button" onClick={() => setIsNewLeadOpen(true)} style={s.primary}>
            <Icon name="plus" style={{ width: 16, height: 16 }} />
            New lead
          </button>
        }
      />

      <p
        role="note"
        style={{
          margin: '0 0 var(--space-4)',
          padding: '10px var(--space-3)',
          fontSize: 14,
          background: 'var(--color-surface-raised)',
          border: 'var(--border-width) solid var(--color-line)',
          borderInlineStart: '4px solid var(--color-action-primary)',
          borderRadius: 'var(--radius-control)',
        }}
      >
        Preview: these leads are sample data and changes aren’t saved yet.
      </p>

      <StatStrip
        items={[
          { label: 'Open leads', value: open.length },
          { label: 'Next step overdue', value: overdue.length, attention: overdue.length > 0 },
          { label: 'Converted', value: leads.filter(l => l.status === 'converted').length },
        ]}
      />

      <div className="massar-tabs" role="tablist" aria-label="CRM views">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            className="massar-tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {typeof t.count === 'number' && <span className="massar-panel-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'leads' && <LeadsTable leads={leads} teamMembers={teamMembers} onSelectLead={openLead} />}

      {tab === 'journey' && (
        <>
          <div className="massar-btn-row" style={{ marginBottom: 'var(--space-3)' }}>
            <label htmlFor="journey-lead" style={{ ...s.label, margin: 0 }}>Lead</label>
            <select
              id="journey-lead"
              value={activeLead?.id || ''}
              onChange={e => setActiveLead(leads.find(l => l.id === e.target.value) || null)}
              style={{ ...s.field, width: 'auto', minWidth: 260 }}
            >
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.fullName} — {l.companyName}</option>
              ))}
            </select>
          </div>
          <JourneyFlowchartCanvas
            activeLead={activeLead}
            onSelectAction={() => activeLead && setDrawerLead(activeLead)}
            onNodeClick={() => activeLead && setDrawerLead(activeLead)}
          />
        </>
      )}

      {tab === 'closing' && (
        <div style={{ maxWidth: 760 }}>
          <DailyCloseChecklist />
        </div>
      )}

      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        existingLeads={leads}
        teamMembers={teamMembers}
        onCreateLead={handleCreateLead}
      />

      <CaseDetailDrawer
        lead={drawerLead}
        onClose={() => setDrawerLead(null)}
        teamMembers={teamMembers}
        onUpdateLead={handleUpdateLead}
      />
    </div>
  )
}
