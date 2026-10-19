'use client'

export type CrmSubNavTab =
  | 'relationship'
  | 'opportunities'
  | 'leads'
  | 'calendar'
  | 'journeys'
  | 'reports'
  | 'closing'

interface CrmHeaderNavProps {
  currentTab: CrmSubNavTab
  onSelectTab: (tab: CrmSubNavTab) => void
  onOpenNewLead: () => void
  totalLeadsCount: number
}

export default function CrmHeaderNav({
  currentTab,
  onSelectTab,
  onOpenNewLead,
  totalLeadsCount,
}: CrmHeaderNavProps) {
  const tabs: { key: CrmSubNavTab; labelEn: string; count?: number }[] = [
    { key: 'journeys', labelEn: 'Customer Journeys', count: totalLeadsCount },
    { key: 'leads', labelEn: 'Leads & Allocation' },
    { key: 'relationship', labelEn: 'Relationship' },
    { key: 'opportunities', labelEn: 'Opportunities' },
    { key: 'calendar', labelEn: 'Calendar & Tasks' },
    { key: 'reports', labelEn: 'Reports & KPIs' },
    { key: 'closing', labelEn: 'Daily Closing' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-3)',
        paddingBottom: 'var(--space-2)',
        borderBottom: 'var(--border-width) solid var(--color-divider)',
      }}
    >
      {/* Pills Container matching Dribbble Reference */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexWrap: 'wrap',
          backgroundColor: 'var(--bone)',
          padding: '4px',
          borderRadius: '24px',
          border: 'var(--border-width) solid var(--color-divider)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: isActive ? 'var(--massar-green)' : 'transparent',
                color: isActive ? 'var(--white)' : 'var(--color-text)',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all var(--motion-fast) var(--motion-ease)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.labelEn}</span>
              {typeof tab.count === 'number' && (
                <span
                  style={{
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--white)',
                    color: isActive ? 'var(--white)' : 'var(--massar-green)',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Primary Action Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onOpenNewLead}
          style={{
            backgroundColor: 'var(--massar-green)',
            color: 'var(--white)',
            border: 'none',
            borderRadius: 'var(--radius-control)',
            padding: '8px 16px',
            fontSize: 'var(--text-body)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background var(--motion-fast) var(--motion-ease)',
          }}
        >
          <span>+ New Lead</span>
        </button>
      </div>
    </div>
  )
}
