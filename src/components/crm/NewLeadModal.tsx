'use client'

import { useState } from 'react'
import { Lead, TeamMember } from '@/lib/crm-data'

interface NewLeadModalProps {
  isOpen: boolean
  onClose: () => void
  existingLeads: Lead[]
  teamMembers: TeamMember[]
  onCreateLead: (lead: Lead) => void
}

export default function NewLeadModal({
  isOpen,
  onClose,
  existingLeads,
  teamMembers,
  onCreateLead,
}: NewLeadModalProps) {
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('Website Inbound')
  const [segment, setSegment] = useState('Enterprise B2B')
  const [serviceInterest, setServiceInterest] = useState('')
  const [assigneeId, setAssigneeId] = useState(teamMembers[0]?.id || '')
  const [nextActionTitle, setNextActionTitle] = useState('')
  const [nextActionDue, setNextActionDue] = useState('')
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  // Deduplication check: check phone or email against existingLeads (SOP §5 & §6)
  const phoneClean = phone.replace(/[\s-]/g, '')
  const duplicateLead = existingLeads.find((l) => {
    const lPhone = l.phone.replace(/[\s-]/g, '')
    const emailMatch = email.trim() && l.email.toLowerCase() === email.trim().toLowerCase()
    const phoneMatch = phoneClean.length > 6 && lPhone.includes(phoneClean)
    return emailMatch || phoneMatch
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !phone || !nextActionTitle) return

    const assignedMember = teamMembers.find((m) => m.id === assigneeId) || teamMembers[0]

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      fullName,
      companyName: companyName || fullName,
      phone,
      email: email || 'not-provided@client.eg',
      status: 'assigned',
      journeyStage: 'awareness',
      priority: 'high',
      assigneeId: assignedMember.id,
      assigneeName: assignedMember.name,
      assigneeRole: assignedMember.role,
      assigneeAvatar: assignedMember.avatar,
      serviceInterest: serviceInterest || 'General Work OS Ingestion',
      segment,
      source,
      createdAt: new Date().toISOString(),
      nextActionTitle,
      nextActionDue: nextActionDue || new Date(Date.now() + 24 * 36e5).toISOString(),
      firstResponseAt: null,
      stageEnteredAt: new Date().toISOString(),
      notes,
      slaHours: 4,
      isOverdue: false,
    }

    onCreateLead(newLead)
    onClose()
  }

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
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--white)',
          borderRadius: 'var(--radius-surface)',
          border: 'var(--border-width) solid var(--color-divider)',
          maxWidth: '640px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 'var(--space-4)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: 'var(--border-width) solid var(--color-divider)',
            paddingBottom: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--massar-green)',
                margin: 0,
                fontFamily: 'var(--font-serif)',
              }}
            >
              Register New Lead (SOP §6)
            </h2>
            <p
              style={{
                fontSize: '11px',
                color: 'var(--color-text)',
                opacity: 0.75,
                margin: '2px 0 0',
              }}
            >
              Deduplication check, sector segmentation, and owner assignment with Cairo due date
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              color: 'var(--color-text)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Deduplication Alert banner (SOP §5) */}
        {duplicateLead && (
          <div
            style={{
              backgroundColor: 'rgba(184, 83, 51, 0.1)',
              border: '1.5px solid var(--clay)',
              borderRadius: 'var(--radius-control)',
              padding: '10px 14px',
              marginBottom: 'var(--space-3)',
              fontSize: '12px',
              color: 'var(--clay)',
              lineHeight: 1.4,
            }}
          >
            <strong>Deduplication Alert (SOP §5):</strong> Existing record found with matching contact details:{' '}
            <strong>«{duplicateLead.fullName} — {duplicateLead.companyName}»</strong>. Updating existing record is recommended.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Karim El-Ghamry"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-control)',
                  border: 'var(--border-width) solid var(--color-border-strong)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
                Company / Organization
              </label>
              <input
                type="text"
                placeholder="e.g. Nile FinTech Solutions"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-control)',
                  border: 'var(--border-width) solid var(--color-border-strong)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
                Phone Number (Deduplication Key) *
              </label>
              <input
                type="tel"
                required
                placeholder="+20 100 234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-control)',
                  border: 'var(--border-width) solid var(--color-border-strong)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="client@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-control)',
                  border: 'var(--border-width) solid var(--color-border-strong)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
                Lead Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-control)',
                  border: 'var(--border-width) solid var(--color-border-strong)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  backgroundColor: 'var(--white)',
                }}
              >
                <option value="Direct Referral">Direct Referral</option>
                <option value="Website Inbound">Website Inbound</option>
                <option value="LinkedIn Campaign">LinkedIn Campaign</option>
                <option value="Partner Event">Partner Event</option>
                <option value="Inbound Phone/WhatsApp">Inbound Phone / WhatsApp</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
                Approved Segment (SOP §8)
              </label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-control)',
                  border: 'var(--border-width) solid var(--color-border-strong)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  backgroundColor: 'var(--white)',
                }}
              >
                <option value="Enterprise B2B">Enterprise B2B</option>
                <option value="Hospitality & Luxury">Hospitality & Luxury</option>
                <option value="Healthcare / Scale-up">Healthcare / Scale-up</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Retail / FMCG">Retail / FMCG</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
              Service / Scope of Interest
            </label>
            <input
              type="text"
              placeholder="e.g. Brand Identity & Visual System 2027"
              value={serviceInterest}
              onChange={(e) => setServiceInterest(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-control)',
                border: 'var(--border-width) solid var(--color-border-strong)',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
                Designated Account Lead (SOP §7)
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-control)',
                  border: 'var(--border-width) solid var(--color-border-strong)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  backgroundColor: 'var(--white)',
                }}
              >
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.role} ({m.activeCases} active)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
                Next Cairo Deadline *
              </label>
              <input
                type="datetime-local"
                value={nextActionDue}
                onChange={(e) => setNextActionDue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-control)',
                  border: 'var(--border-width) solid var(--color-border-strong)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
              Next Action Item (Action-oriented verb — SOP §9) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Conduct creative discovery & scope calibration call"
              value={nextActionTitle}
              onChange={(e) => setNextActionTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-control)',
                border: 'var(--border-width) solid var(--color-border-strong)',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--massar-green)', marginBottom: '4px' }}>
              Operational Notes
            </label>
            <textarea
              rows={2}
              placeholder="Record verified facts and project brief concisely..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-control)',
                border: 'var(--border-width) solid var(--color-border-strong)',
                fontSize: '13px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              borderTop: 'var(--border-width) solid var(--color-divider)',
              paddingTop: 'var(--space-3)',
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
                color: 'var(--color-text)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-control)',
                border: 'none',
                backgroundColor: 'var(--massar-green)',
                color: 'var(--white)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save & Register Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
