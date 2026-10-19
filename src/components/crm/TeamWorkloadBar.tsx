'use client'

import { TeamMember } from '@/lib/crm-data'

interface TeamWorkloadBarProps {
  members: TeamMember[]
  selectedMemberId: string | null
  onSelectMember: (id: string | null) => void
}

export default function TeamWorkloadBar({
  members,
  selectedMemberId,
  onSelectMember,
}: TeamWorkloadBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        flexWrap: 'wrap',
        padding: 'var(--space-2) var(--space-3)',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-control)',
        border: 'var(--border-width) solid var(--color-divider)',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--color-text)',
          marginInlineEnd: 'var(--space-2)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--massar-green)',
            display: 'inline-block',
          }}
        />
        Team Workload:
      </span>

      <button
        type="button"
        onClick={() => onSelectMember(null)}
        style={{
          background: selectedMemberId === null ? 'var(--massar-green)' : 'transparent',
          color: selectedMemberId === null ? 'var(--white)' : 'var(--color-text)',
          border: 'var(--border-width) solid ' + (selectedMemberId === null ? 'var(--massar-green)' : 'var(--color-divider)'),
          borderRadius: '20px',
          padding: '4px 12px',
          fontSize: 'var(--text-micro)',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all var(--motion-fast) var(--motion-ease)',
        }}
      >
        All Members ({members.reduce((acc, m) => acc + m.activeCases, 0)})
      </button>

      {members.map((member) => {
        const isSelected = selectedMemberId === member.id
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelectMember(isSelected ? null : member.id)}
            title={`${member.name} (${member.role}) — ${member.activeCases} active cases`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '3px 10px 3px 4px',
              backgroundColor: isSelected ? 'rgba(13, 59, 52, 0.12)' : 'var(--white)',
              border: isSelected
                ? '2px solid var(--massar-green)'
                : 'var(--border-width) solid var(--color-divider)',
              borderRadius: '24px',
              cursor: 'pointer',
              transition: 'all var(--motion-fast) var(--motion-ease)',
            }}
          >
            {/* Avatar circle */}
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--massar-green)',
                color: 'var(--white)',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                letterSpacing: '-0.02em',
              }}
            >
              {member.avatar}
            </span>

            {/* Name */}
            <span
              style={{
                fontSize: 'var(--text-label)',
                fontWeight: 600,
                color: 'var(--color-text)',
                whiteSpace: 'nowrap',
              }}
            >
              {member.name.split(' ')[0]}
            </span>

            {/* Workload badge circle from Dribbble shot */}
            <span
              style={{
                minWidth: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: member.activeCases >= 5 ? 'var(--clay)' : 'var(--massar-green)',
                color: 'var(--white)',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              {member.activeCases}
            </span>
          </button>
        )
      })}
    </div>
  )
}
