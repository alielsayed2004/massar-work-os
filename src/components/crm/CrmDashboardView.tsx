'use client'

import { useState } from 'react'
import {
  Lead,
  TeamMember,
  KnowledgeItem,
  INITIAL_LEADS,
  INITIAL_TEAM_MEMBERS,
  INITIAL_KNOWLEDGE_ITEMS,
} from '@/lib/crm-data'
import CrmHeaderNav, { CrmSubNavTab } from './CrmHeaderNav'
import TeamWorkloadBar from './TeamWorkloadBar'
import JourneyFlowchartCanvas from './JourneyFlowchartCanvas'
import KnowledgeTable from './KnowledgeTable'
import CrmAnalyticsPanel from './CrmAnalyticsPanel'
import DailyCloseChecklist from './DailyCloseChecklist'
import NewLeadModal from './NewLeadModal'
import CaseDetailDrawer from './CaseDetailDrawer'

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
  const [knowledgeItems] = useState<KnowledgeItem[]>(INITIAL_KNOWLEDGE_ITEMS)

  const [currentTab, setCurrentTab] = useState<CrmSubNavTab>('journeys')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [activeLead, setActiveLead] = useState<Lead | null>(leads[0] || null)
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null)
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false)

  // Filter leads based on selected team member
  const visibleLeads = selectedMemberId
    ? leads.filter((l) => l.assigneeId === selectedMemberId)
    : leads

  const handleCreateLead = (newLead: Lead) => {
    setLeads([newLead, ...leads])
    setActiveLead(newLead)
  }

  const handleUpdateLead = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    if (activeLead?.id === updated.id) {
      setActiveLead(updated)
    }
  }

  const handleSelectAction = () => {
    if (!activeLead) {
      if (leads.length > 0) setActiveLead(leads[0])
    }
    // Open drawer for the active lead
    if (activeLead) {
      setDrawerLead(activeLead)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Page Title & Operational Mission */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '32px',
              fontWeight: 500,
              color: 'var(--color-text-strong)',
              margin: '0 0 4px',
              lineHeight: 1.2,
            }}
          >
            Massar — CRM & Customer Journeys
          </h1>
          <p
            style={{
              fontSize: 'var(--text-body)',
              color: 'var(--color-text)',
              opacity: 0.85,
              margin: 0,
            }}
          >
            SOP 1.0 — Lead Management, Workload Allocation & Customer Journey Execution
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '16px',
              backgroundColor: 'var(--bone)',
              border: 'var(--border-width) solid var(--color-divider)',
              fontWeight: 600,
              color: 'var(--massar-green)',
            }}
          >
            Africa/Cairo
          </span>
          <span
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '16px',
              backgroundColor: 'var(--massar-green)',
              color: 'var(--white)',
              fontWeight: 600,
            }}
          >
            {leads.length} Active Leads
          </span>
        </div>
      </div>

      {/* Sub-navigation Pills (matching Dribbble reference header) */}
      <CrmHeaderNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewLead={() => setIsNewLeadOpen(true)}
        totalLeadsCount={leads.length}
      />

      {/* Team Workload Avatars Bar */}
      <TeamWorkloadBar
        members={teamMembers}
        selectedMemberId={selectedMemberId}
        onSelectMember={setSelectedMemberId}
      />

      {/* Tab Content Display */}
      {currentTab === 'journeys' && (
        <>
          {/* Main Flowchart Canvas */}
          <JourneyFlowchartCanvas
            activeLead={activeLead}
            onSelectAction={handleSelectAction}
            onNodeClick={() => {
              if (activeLead) setDrawerLead(activeLead)
            }}
          />

          {/* Bottom Operational Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
              gap: 'var(--space-4)',
              alignItems: 'start',
            }}
          >
            {/* Suggested Knowledge & Active Cases Table */}
            <KnowledgeTable
              knowledgeItems={knowledgeItems}
              leads={visibleLeads}
              onSelectLead={(l) => {
                setActiveLead(l)
                setDrawerLead(l)
              }}
              onOpenNewLeadModal={() => setIsNewLeadOpen(true)}
            />

            {/* Right Stack: Analytics & Daily Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <CrmAnalyticsPanel />
              <DailyCloseChecklist />
            </div>
          </div>
        </>
      )}

      {currentTab === 'leads' && (
        <KnowledgeTable
          knowledgeItems={knowledgeItems}
          leads={visibleLeads}
          onSelectLead={(l) => {
            setActiveLead(l)
            setDrawerLead(l)
          }}
          onOpenNewLeadModal={() => setIsNewLeadOpen(true)}
        />
      )}

      {currentTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <CrmAnalyticsPanel />
          <DailyCloseChecklist />
        </div>
      )}

      {currentTab === 'closing' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <DailyCloseChecklist />
        </div>
      )}

      {(currentTab === 'relationship' || currentTab === 'opportunities' || currentTab === 'calendar') && (
        <div
          style={{
            backgroundColor: 'var(--white)',
            border: 'var(--border-width) solid var(--color-divider)',
            borderRadius: 'var(--radius-surface)',
            padding: 'var(--space-5)',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--massar-green)', margin: '0 0 8px' }}>
            {currentTab === 'relationship' && 'Accounts & Stakeholder Relationships'}
            {currentTab === 'opportunities' && 'Sales Opportunities & Open Pipeline'}
            {currentTab === 'calendar' && 'Upcoming Tasks & Cairo Deadlines'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text)', opacity: 0.8, maxWidth: '540px', margin: '0 auto 16px' }}>
            Synchronized with active customer journey stages and team workload allocations under SOP §9.
          </p>
          <button
            type="button"
            onClick={() => setCurrentTab('journeys')}
            style={{
              backgroundColor: 'var(--massar-green)',
              color: 'var(--white)',
              border: 'none',
              borderRadius: 'var(--radius-control)',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to Customer Journeys →
          </button>
        </div>
      )}

      {/* Modals & Drawers */}
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
