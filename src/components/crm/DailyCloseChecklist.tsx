'use client'

import { useState } from 'react'
import { DailyChecklistItem, INITIAL_DAILY_CHECKLIST } from '@/lib/crm-data'

export default function DailyCloseChecklist() {
  const [items, setItems] = useState<DailyChecklistItem[]>(INITIAL_DAILY_CHECKLIST)
  const [lastAuditTime, setLastAuditTime] = useState<string>('Today at 12:45 Cairo Time')

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, completed: !it.completed } : it))
    )
    setLastAuditTime('Updated just now (Cairo Time)')
  }

  const completedCount = items.filter((it) => it.completed).length
  const totalCount = items.length
  const progressPercent = Math.round((completedCount / totalCount) * 100)
  const isReadyToClose = completedCount === totalCount

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
          flexWrap: 'wrap',
          gap: '8px',
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
            Daily Close Checklist
          </h3>
          <p
            style={{
              fontSize: '11px',
              color: 'var(--color-text)',
              opacity: 0.75,
              margin: '2px 0 0',
            }}
          >
            SOP §14 — Daily Operations & Compliance Gate
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: isReadyToClose ? 'rgba(13, 59, 52, 0.15)' : 'rgba(184, 83, 51, 0.15)',
              color: isReadyToClose ? 'var(--massar-green)' : 'var(--clay)',
            }}
          >
            {completedCount}/{totalCount} Completed ({progressPercent}%)
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '6px',
          backgroundColor: 'var(--bone)',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: 'var(--space-3)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: isReadyToClose ? 'var(--massar-green)' : 'var(--clay)',
            transition: 'width var(--motion-standard) var(--motion-ease)',
          }}
        />
      </div>

      {/* Checklist Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map((item, idx) => (
          <label
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '10px 12px',
              backgroundColor: item.completed ? 'rgba(13, 59, 52, 0.04)' : 'var(--bone)',
              borderRadius: 'var(--radius-control)',
              border: 'var(--border-width) solid ' + (item.completed ? 'var(--massar-green)' : 'var(--color-divider)'),
              cursor: 'pointer',
              transition: 'all var(--motion-fast) var(--motion-ease)',
            }}
          >
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => toggleItem(item.id)}
              style={{
                margin: '2px 0 0',
                width: '16px',
                height: '16px',
                accentColor: 'var(--massar-green)',
                cursor: 'pointer',
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  lineHeight: 1.35,
                  textDecoration: item.completed ? 'line-through' : 'none',
                  opacity: item.completed ? 0.8 : 1,
                }}
              >
                {idx + 1}. {item.textEn}
              </div>
              <div
                style={{
                  fontSize: '10.5px',
                  color: 'var(--massar-green)',
                  fontWeight: 600,
                  marginTop: '4px',
                }}
              >
                Role: {item.roleRequired}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Audit info */}
      <div
        style={{
          marginTop: 'var(--space-3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--color-text)',
          opacity: 0.75,
        }}
      >
        <span>Last Audit: {lastAuditTime}</span>
        {isReadyToClose ? (
          <span style={{ color: 'var(--massar-green)', fontWeight: 700 }}>
            Ready to close shift
          </span>
        ) : (
          <span style={{ color: 'var(--clay)', fontWeight: 600 }}>
            Pending items before daily close
          </span>
        )}
      </div>
    </div>
  )
}
