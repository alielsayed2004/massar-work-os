'use client'

import { useState } from 'react'
import { Lead } from '@/lib/crm-data'

interface FlowNode {
  id: string
  stageId: string
  titleEn: string
  assigneeName: string
  assigneeAvatar: string
  isDone: boolean
  hasCalendar: boolean
  hasAction: boolean
  slaTime?: string
  priority?: 'high' | 'medium' | 'low'
}

interface JourneyFlowchartCanvasProps {
  activeLead: Lead | null
  onSelectAction: (actionKey: string) => void
  onNodeClick: (node: FlowNode) => void
}

export default function JourneyFlowchartCanvas({
  activeLead,
  onSelectAction,
  onNodeClick,
}: JourneyFlowchartCanvasProps) {
  // State of nodes completion
  const [nodes, setNodes] = useState<FlowNode[]>([
    // Stage 1: Case Allocation
    {
      id: 'node-alloc-1',
      stageId: 'allocation',
      titleEn: 'Allocate Case to User',
      assigneeName: activeLead?.assigneeName || 'Sarah Mansour',
      assigneeAvatar: activeLead?.assigneeAvatar || 'SM',
      isDone: true,
      hasCalendar: true,
      hasAction: true,
      slaTime: '15m SLA',
    },
    {
      id: 'node-alloc-2',
      stageId: 'allocation',
      titleEn: 'Acknowledge Case receipt to customer',
      assigneeName: activeLead?.assigneeName || 'Sarah Mansour',
      assigneeAvatar: activeLead?.assigneeAvatar || 'SM',
      isDone: true,
      hasCalendar: false,
      hasAction: true,
      slaTime: '30m SLA',
    },

    // Stage 2: Issue Identification & Qualification
    {
      id: 'node-id-1',
      stageId: 'identification',
      titleEn: 'Identify Issue Category',
      assigneeName: 'Ali Elsayed',
      assigneeAvatar: 'AE',
      isDone: true,
      hasCalendar: true,
      hasAction: true,
    },
    {
      id: 'node-id-2',
      stageId: 'identification',
      titleEn: 'Identify Issue Severity',
      assigneeName: 'Ali Elsayed',
      assigneeAvatar: 'AE',
      isDone: true,
      hasCalendar: false,
      hasAction: true,
      priority: 'high',
    },
    {
      id: 'node-id-3',
      stageId: 'identification',
      titleEn: 'Identify Issue Impact',
      assigneeName: 'Nourhan Zaki',
      assigneeAvatar: 'NZ',
      isDone: false,
      hasCalendar: false,
      hasAction: true,
    },
    {
      id: 'node-id-4',
      stageId: 'identification',
      titleEn: 'Allocate to Resolution Team',
      assigneeName: 'Ahmed Tarek',
      assigneeAvatar: 'AT',
      isDone: false,
      hasCalendar: true,
      hasAction: true,
    },
    {
      id: 'node-id-5',
      stageId: 'identification',
      titleEn: 'Advise Customer of Resolution Estimate',
      assigneeName: 'Sarah Mansour',
      assigneeAvatar: 'SM',
      isDone: false,
      hasCalendar: true,
      hasAction: true,
      slaTime: '2h SLA',
    },

    // Stage 3: Technical Resolution
    {
      id: 'node-res-1',
      stageId: 'resolution',
      titleEn: 'Identify Issue Dependencies',
      assigneeName: 'Ahmed Tarek',
      assigneeAvatar: 'AT',
      isDone: false,
      hasCalendar: false,
      hasAction: true,
    },
    {
      id: 'node-res-2',
      stageId: 'resolution',
      titleEn: 'Identify Issue Resolution',
      assigneeName: 'Ali Elsayed',
      assigneeAvatar: 'AE',
      isDone: false,
      hasCalendar: true,
      hasAction: true,
    },
    {
      id: 'node-res-3',
      stageId: 'resolution',
      titleEn: 'Estimate Resolution Time',
      assigneeName: 'Youssef Karim',
      assigneeAvatar: 'YK',
      isDone: false,
      hasCalendar: true,
      hasAction: true,
      slaTime: 'Cairo 18:00',
    },
    {
      id: 'node-res-4',
      stageId: 'resolution',
      titleEn: 'Advise Customer Issue Resolved',
      assigneeName: 'Sarah Mansour',
      assigneeAvatar: 'SM',
      isDone: false,
      hasCalendar: false,
      hasAction: true,
    },
  ])

  const [activeTaskKey, setActiveTaskKey] = useState<string>('req-process')

  const toggleNodeDone = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isDone: !n.isDone } : n))
    )
  }

  const tasksMatrix = [
    { key: 'req-process', en: 'Request Processing', isPrimary: true },
    { key: 'prob-resol', en: 'Problem Resolution', isPrimary: false },
    { key: 'cust-comm', en: 'Customer Communication', isPrimary: false },
    { key: 'test-verif', en: 'Testing and Verification', isPrimary: false },
    { key: 'cust-notif', en: 'Customer Notification', isPrimary: false },
    { key: 'cust-satis', en: 'Customer Satisfaction', isPrimary: false },
  ]

  const stage1Nodes = nodes.filter((n) => n.stageId === 'allocation')
  const stage2Nodes = nodes.filter((n) => n.stageId === 'identification')
  const stage3Nodes = nodes.filter((n) => n.stageId === 'resolution')

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: 'var(--white)',
        border: 'var(--border-width) solid var(--color-divider)',
        borderRadius: 'var(--radius-surface)',
        padding: 'var(--space-4)',
        boxShadow: '0 4px 20px rgba(16, 24, 21, 0.04)',
        overflowX: 'auto',
      }}
    >
      {/* Top Section Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
          borderBottom: 'var(--border-width) solid var(--color-divider)',
          paddingBottom: 'var(--space-3)',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'var(--massar-green)',
                display: 'inline-block',
              }}
            />
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--color-text-strong)',
                margin: 0,
                fontFamily: 'var(--font-serif)',
              }}
            >
              Customer Journeys
            </h2>
          </div>
          <p
            style={{
              fontSize: 'var(--text-label)',
              color: 'var(--color-text)',
              margin: '4px 0 0',
              opacity: 0.85,
            }}
          >
            Active Pipeline: {activeLead ? `${activeLead.companyName} (${activeLead.fullName})` : 'All Active Operational Cases'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: 'var(--text-micro)',
              padding: '4px 10px',
              borderRadius: '16px',
              backgroundColor: 'var(--bone)',
              border: 'var(--border-width) solid var(--color-divider)',
              fontWeight: 600,
              color: 'var(--massar-green)',
            }}
          >
            SOP Mode: Operational Standard 1.0
          </span>
          <span
            style={{
              fontSize: 'var(--text-micro)',
              padding: '4px 10px',
              borderRadius: '16px',
              backgroundColor: 'var(--massar-green)',
              color: 'var(--white)',
              fontWeight: 600,
            }}
          >
            Live Flow
          </span>
        </div>
      </div>

      {/* Columns Grid Layout with Connectors */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(230px, 1fr) minmax(280px, 1.25fr) minmax(280px, 1.25fr) minmax(240px, 1fr)',
          gap: 'var(--space-4)',
          position: 'relative',
          minWidth: '1050px',
        }}
      >
        {/* ================= STAGE 1: Case Allocation ================= */}
        <div
          style={{
            backgroundColor: 'var(--bone)',
            borderRadius: 'var(--radius-control)',
            padding: 'var(--space-3)',
            border: 'var(--border-width) solid var(--color-divider)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: 'var(--border-width) solid rgba(16, 24, 21, 0.1)',
              paddingBottom: '8px',
            }}
          >
            <h3
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--massar-green)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              1. Case Allocation
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--massar-green)',
                backgroundColor: 'rgba(13, 59, 52, 0.08)',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {stage1Nodes.filter((n) => n.isDone).length}/{stage1Nodes.length} Done
            </span>
          </div>

          <p
            style={{
              fontSize: '11px',
              color: 'var(--color-text)',
              margin: '-4px 0 4px',
              opacity: 0.75,
            }}
          >
            Triage, deduplication & initial case assignment
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stage1Nodes.map((node) => (
              <div
                key={node.id}
                onClick={() => onNodeClick(node)}
                role="button"
                tabIndex={0}
                style={{
                  backgroundColor: 'var(--white)',
                  borderRadius: 'var(--radius-control)',
                  border: node.isDone
                    ? '1.5px solid var(--massar-green)'
                    : 'var(--border-width) solid var(--color-divider)',
                  padding: '12px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all var(--motion-fast) var(--motion-ease)',
                  boxShadow: '0 2px 6px rgba(16, 24, 21, 0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--massar-green)',
                        color: 'var(--white)',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {node.assigneeAvatar}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                      }}
                    >
                      {node.assigneeName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {node.slaTime && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--massar-green)',
                          fontWeight: 600,
                          backgroundColor: 'rgba(13, 59, 52, 0.08)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                        }}
                      >
                        {node.slaTime}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => toggleNodeDone(node.id, e)}
                      title={node.isDone ? 'Mark as pending' : 'Mark as done'}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '4px',
                        border: node.isDone
                          ? 'none'
                          : 'var(--border-width) solid var(--color-divider)',
                        backgroundColor: node.isDone ? 'var(--massar-green)' : 'transparent',
                        color: 'var(--white)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                      }}
                    >
                      {node.isDone ? '✓' : ''}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      lineHeight: 1.3,
                    }}
                  >
                    {node.titleEn}
                  </div>
                </div>

                {/* Right connector dot */}
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineEnd: '-7px',
                    transform: 'translateY(-50%)',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: node.isDone ? 'var(--massar-green)' : 'var(--stone)',
                    border: '2px solid var(--white)',
                    boxShadow: '0 0 0 1px var(--color-divider)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ================= STAGE 2: Issue Identification ================= */}
        <div
          style={{
            backgroundColor: 'var(--bone)',
            borderRadius: 'var(--radius-control)',
            padding: 'var(--space-3)',
            border: 'var(--border-width) solid var(--color-divider)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: 'var(--border-width) solid rgba(16, 24, 21, 0.1)',
              paddingBottom: '8px',
            }}
          >
            <h3
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--massar-green)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              2. Issue Identification
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--massar-green)',
                backgroundColor: 'rgba(13, 59, 52, 0.08)',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {stage2Nodes.filter((n) => n.isDone).length}/{stage2Nodes.length} Done
            </span>
          </div>

          <p
            style={{
              fontSize: '11px',
              color: 'var(--color-text)',
              margin: '-4px 0 4px',
              opacity: 0.75,
            }}
          >
            Qualification, impact assessment & team routing
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stage2Nodes.map((node) => (
              <div
                key={node.id}
                onClick={() => onNodeClick(node)}
                role="button"
                tabIndex={0}
                style={{
                  backgroundColor: 'var(--white)',
                  borderRadius: 'var(--radius-control)',
                  border: node.isDone
                    ? '1.5px solid var(--massar-green)'
                    : 'var(--border-width) solid var(--color-divider)',
                  padding: '10px 12px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all var(--motion-fast) var(--motion-ease)',
                  boxShadow: '0 2px 6px rgba(16, 24, 21, 0.04)',
                }}
              >
                {/* Left connector dot */}
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineStart: '-7px',
                    transform: 'translateY(-50%)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: node.isDone ? 'var(--massar-green)' : 'var(--stone)',
                    border: '2px solid var(--white)',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--massar-green)',
                        color: 'var(--white)',
                        fontSize: '10px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {node.assigneeAvatar}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                      }}
                    >
                      {node.assigneeName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {node.priority && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--white)',
                          backgroundColor: 'var(--clay)',
                          fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: '4px',
                        }}
                      >
                        {node.priority}
                      </span>
                    )}
                    {node.hasCalendar && (
                      <span title="Scheduled" style={{ fontSize: '11px', color: 'var(--stone)' }}>
                        📅
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => toggleNodeDone(node.id, e)}
                      title={node.isDone ? 'Mark as pending' : 'Mark as done'}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: node.isDone
                          ? 'none'
                          : 'var(--border-width) solid var(--color-divider)',
                        backgroundColor: node.isDone ? 'var(--massar-green)' : 'transparent',
                        color: 'var(--white)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                      }}
                    >
                      {node.isDone ? '✓' : ''}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      lineHeight: 1.25,
                    }}
                  >
                    {node.titleEn}
                  </div>
                </div>

                {/* Right connector dot */}
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineEnd: '-7px',
                    transform: 'translateY(-50%)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: node.isDone ? 'var(--massar-green)' : 'var(--stone)',
                    border: '2px solid var(--white)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ================= STAGE 3: Technical Resolution ================= */}
        <div
          style={{
            backgroundColor: 'var(--bone)',
            borderRadius: 'var(--radius-control)',
            padding: 'var(--space-3)',
            border: 'var(--border-width) solid var(--color-divider)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: 'var(--border-width) solid rgba(16, 24, 21, 0.1)',
              paddingBottom: '8px',
            }}
          >
            <h3
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--massar-green)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              3. Technical Resolution
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--massar-green)',
                backgroundColor: 'rgba(13, 59, 52, 0.08)',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {stage3Nodes.filter((n) => n.isDone).length}/{stage3Nodes.length} Done
            </span>
          </div>

          <p
            style={{
              fontSize: '11px',
              color: 'var(--color-text)',
              margin: '-4px 0 4px',
              opacity: 0.75,
            }}
          >
            Dependencies, technical execution & sign-off
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stage3Nodes.map((node) => (
              <div
                key={node.id}
                onClick={() => onNodeClick(node)}
                role="button"
                tabIndex={0}
                style={{
                  backgroundColor: 'var(--white)',
                  borderRadius: 'var(--radius-control)',
                  border: node.isDone
                    ? '1.5px solid var(--massar-green)'
                    : 'var(--border-width) solid var(--color-divider)',
                  padding: '10px 12px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all var(--motion-fast) var(--motion-ease)',
                  boxShadow: '0 2px 6px rgba(16, 24, 21, 0.04)',
                }}
              >
                {/* Left connector dot */}
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineStart: '-7px',
                    transform: 'translateY(-50%)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: node.isDone ? 'var(--massar-green)' : 'var(--stone)',
                    border: '2px solid var(--white)',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--massar-green)',
                        color: 'var(--white)',
                        fontSize: '10px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {node.assigneeAvatar}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                      }}
                    >
                      {node.assigneeName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {node.slaTime && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--massar-green)',
                          fontWeight: 600,
                          backgroundColor: 'rgba(13, 59, 52, 0.08)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                        }}
                      >
                        {node.slaTime}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => toggleNodeDone(node.id, e)}
                      title={node.isDone ? 'Mark as pending' : 'Mark as done'}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: node.isDone
                          ? 'none'
                          : 'var(--border-width) solid var(--color-divider)',
                        backgroundColor: node.isDone ? 'var(--massar-green)' : 'transparent',
                        color: 'var(--white)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                      }}
                    >
                      {node.isDone ? '✓' : ''}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      lineHeight: 1.25,
                    }}
                  >
                    {node.titleEn}
                  </div>
                </div>

                {/* Right connector dot leading to Tasks Matrix */}
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineEnd: '-7px',
                    transform: 'translateY(-50%)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: node.isDone ? 'var(--massar-green)' : 'var(--stone)',
                    border: '2px solid var(--white)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ================= STAGE 4: New Tasks Matrix ================= */}
        <div
          style={{
            backgroundColor: 'var(--bone)',
            borderRadius: 'var(--radius-control)',
            padding: 'var(--space-3)',
            border: 'var(--border-width) solid var(--color-divider)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: 'var(--border-width) solid rgba(16, 24, 21, 0.1)',
              paddingBottom: '8px',
            }}
          >
            <h3
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--massar-green)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              4. New Tasks Matrix
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--massar-green)',
                backgroundColor: 'rgba(13, 59, 52, 0.08)',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              Quick Launcher
            </span>
          </div>

          <p
            style={{
              fontSize: '11px',
              color: 'var(--color-text)',
              margin: '-4px 0 4px',
              opacity: 0.75,
            }}
          >
            Quick operational trigger actions
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            {tasksMatrix.map((task) => {
              const isActive = activeTaskKey === task.key
              return (
                <button
                  key={task.key}
                  type="button"
                  onClick={() => {
                    setActiveTaskKey(task.key)
                    onSelectAction(task.key)
                  }}
                  style={{
                    backgroundColor: isActive ? 'var(--massar-green)' : 'var(--white)',
                    color: isActive ? 'var(--white)' : 'var(--color-text)',
                    border: isActive
                      ? 'none'
                      : 'var(--border-width) solid var(--color-divider)',
                    borderRadius: 'var(--radius-control)',
                    padding: '12px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    minHeight: '56px',
                    transition: 'all var(--motion-fast) var(--motion-ease)',
                    boxShadow: isActive
                      ? '0 4px 14px rgba(13, 59, 52, 0.25)'
                      : '0 2px 4px rgba(16, 24, 21, 0.03)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}
                  >
                    {task.en}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Quick Context Tip */}
          <div
            style={{
              marginTop: 'auto',
              padding: '10px',
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-control)',
              border: 'var(--border-width) solid var(--color-divider)',
              fontSize: '11px',
              lineHeight: 1.4,
              color: 'var(--color-text)',
            }}
          >
            <strong>SOP §9 Rule:</strong> Every follow-up action must begin with an explicit action verb, an assigned owner, and a Cairo due date.
          </div>
        </div>
      </div>
    </div>
  )
}
