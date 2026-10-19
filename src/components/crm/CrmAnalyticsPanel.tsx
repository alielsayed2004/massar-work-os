'use client'

import { CRM_METRICS } from '@/lib/crm-data'

export default function CrmAnalyticsPanel() {
  const metrics = [
    {
      labelEn: 'First Response Time',
      value: CRM_METRICS.firstResponseTimeAvg,
      target: CRM_METRICS.firstResponseTarget,
      tone: 'good',
      note: 'Calculated in Cairo business hours',
    },
    {
      labelEn: 'Stage Conversion Rate',
      value: CRM_METRICS.conversionRate,
      target: CRM_METRICS.conversionChange,
      tone: 'good',
      note: 'Month-over-month (MoM) progression',
    },
    {
      labelEn: 'Overdue Tasks %',
      value: CRM_METRICS.overdueTasksRate,
      target: CRM_METRICS.overdueStatus,
      tone: 'good',
      note: 'Within designated SLA threshold',
    },
    {
      labelEn: 'Average Stage Age',
      value: CRM_METRICS.averageStageAge,
      target: 'Target < 3d',
      tone: 'good',
      note: 'Bottleneck tracking across stages',
    },
    {
      labelEn: 'Data Completeness %',
      value: CRM_METRICS.dataCompleteness,
      target: 'Audit Pass',
      tone: 'good',
      note: 'Verified phone, email, owner & due date',
    },
  ]

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-3)',
          borderBottom: 'var(--border-width) solid var(--color-divider)',
          paddingBottom: 'var(--space-2)',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--massar-green)',
              margin: 0,
              fontFamily: 'var(--font-serif)',
            }}
          >
            Analytics & Operational Metrics
          </h3>
          <p
            style={{
              fontSize: '11px',
              color: 'var(--color-text)',
              opacity: 0.75,
              margin: '2px 0 0',
            }}
          >
            SOP §11 — Operations Audit & Service Performance
          </p>
        </div>

        <span
          style={{
            fontSize: '11px',
            backgroundColor: 'rgba(13, 59, 52, 0.08)',
            color: 'var(--massar-green)',
            padding: '3px 8px',
            borderRadius: '12px',
            fontWeight: 600,
          }}
        >
          Active Cycle
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {metrics.map((m, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'var(--bone)',
              borderRadius: 'var(--radius-control)',
              border: 'var(--border-width) solid var(--color-divider)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform var(--motion-fast) var(--motion-ease)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--massar-green)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '8px',
                }}
              >
                {m.labelEn}
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {m.value}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--massar-green)',
                    backgroundColor: 'var(--white)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: 'var(--border-width) solid var(--color-divider)',
                  }}
                >
                  {m.target}
                </span>
              </div>

              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--color-text)',
                  opacity: 0.65,
                  marginTop: '4px',
                }}
              >
                {m.note}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
