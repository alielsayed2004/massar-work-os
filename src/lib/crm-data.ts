export type LeadStatus =
  | 'new'
  | 'assigned'
  | 'contacted'
  | 'qualified'
  | 'follow_up'
  | 'converted'
  | 'closed'

export type JourneyStage =
  | 'awareness'
  | 'consideration'
  | 'purchase'
  | 'onboarding'
  | 'retention'
  | 'support'
  | 'advocacy'

export type Priority = 'low' | 'medium' | 'high'

export interface Lead {
  id: string
  fullName: string
  companyName: string
  phone: string
  email: string
  status: LeadStatus
  journeyStage: JourneyStage
  priority: Priority
  assigneeId: string
  assigneeName: string
  assigneeRole: string
  assigneeAvatar: string
  serviceInterest: string
  segment: string
  source: string
  createdAt: string
  nextActionTitle: string
  nextActionDue: string
  firstResponseAt: string | null
  stageEnteredAt: string
  notes: string
  slaHours: number
  isOverdue?: boolean
}

export interface TeamMember {
  id: string
  name: string
  role: string
  avatar: string
  activeCases: number
  statusBadgeColor: string
}

export interface KnowledgeItem {
  id: string
  subject: string
  category: string
  status: 'executed' | 'in_progress' | 'scheduled' | 'review'
  startDate: string
  endDate: string
  assignedUser: string
  assignedRole: string
}

export interface DailyChecklistItem {
  id: string
  textAr: string
  textEn: string
  completed: boolean
  roleRequired: string
}

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'u-1',
    name: 'Ali Elsayed',
    role: 'Creative Director',
    avatar: 'AE',
    activeCases: 4,
    statusBadgeColor: '#0D3B34',
  },
  {
    id: 'u-2',
    name: 'Sarah Mansour',
    role: 'Client Success Manager',
    avatar: 'SM',
    activeCases: 6,
    statusBadgeColor: '#B85333',
  },
  {
    id: 'u-3',
    name: 'Ahmed Tarek',
    role: 'Brand Lead',
    avatar: 'AT',
    activeCases: 3,
    statusBadgeColor: '#0D3B34',
  },
  {
    id: 'u-4',
    name: 'Nourhan Zaki',
    role: 'Account Strategist',
    avatar: 'NZ',
    activeCases: 5,
    statusBadgeColor: '#B85333',
  },
  {
    id: 'u-5',
    name: 'Omar Mostafa',
    role: 'Motion & UX Director',
    avatar: 'OM',
    activeCases: 2,
    statusBadgeColor: '#0D3B34',
  },
  {
    id: 'u-6',
    name: 'Youssef Karim',
    role: 'Senior Project Manager',
    avatar: 'YK',
    activeCases: 4,
    statusBadgeColor: '#9A9791',
  },
]

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-101',
    fullName: 'Karim El-Ghamry',
    companyName: 'Nile FinTech Solutions',
    phone: '+20 100 234 5678',
    email: 'k.ghamry@nilefintech.com',
    status: 'assigned',
    journeyStage: 'awareness',
    priority: 'high',
    assigneeId: 'u-2',
    assigneeName: 'Sarah Mansour',
    assigneeRole: 'Client Success Manager',
    assigneeAvatar: 'SM',
    serviceInterest: 'Work OS Rebranding & Portal System',
    segment: 'Enterprise B2B',
    source: 'Direct Referral',
    createdAt: '2026-10-17T09:30:00Z',
    nextActionTitle: 'Send Introductory Alignment Pitch & SLA Deck',
    nextActionDue: '2026-10-18T16:00:00Z',
    firstResponseAt: '2026-10-17T10:15:00Z',
    stageEnteredAt: '2026-10-17T09:30:00Z',
    notes: 'Interested in full enterprise workspace migration and custom client portal design.',
    slaHours: 4,
    isOverdue: false,
  },
  {
    id: 'lead-102',
    fullName: 'Laila Zahran',
    companyName: 'Aura Luxury Hospitality',
    phone: '+20 122 890 1234',
    email: 'lzahran@aurahotels.eg',
    status: 'qualified',
    journeyStage: 'consideration',
    priority: 'high',
    assigneeId: 'u-1',
    assigneeName: 'Ali Elsayed',
    assigneeRole: 'Creative Director',
    assigneeAvatar: 'AE',
    serviceInterest: 'Brand Identity & Visual System 2027',
    segment: 'Hospitality & Luxury',
    source: 'Website Inbound',
    createdAt: '2026-10-16T11:00:00Z',
    nextActionTitle: 'Conduct Creative Discovery & Scope Calibration Call',
    nextActionDue: '2026-10-19T13:00:00Z',
    firstResponseAt: '2026-10-16T11:35:00Z',
    stageEnteredAt: '2026-10-16T14:20:00Z',
    notes: 'Approved budget. Requires two distinct sub-brands under parent umbrella.',
    slaHours: 8,
    isOverdue: false,
  },
  {
    id: 'lead-103',
    fullName: 'Dr. Tarek Fouad',
    companyName: 'MedPath Diagnostics Network',
    phone: '+20 109 456 7890',
    email: 'tarek.fouad@medpath.io',
    status: 'follow_up',
    journeyStage: 'purchase',
    priority: 'medium',
    assigneeId: 'u-4',
    assigneeName: 'Nourhan Zaki',
    assigneeRole: 'Account Strategist',
    assigneeAvatar: 'NZ',
    serviceInterest: 'Enterprise Design Retainer & UI System',
    segment: 'Healthcare / Scale-up',
    source: 'LinkedIn Campaign',
    createdAt: '2026-10-14T14:15:00Z',
    nextActionTitle: 'Final Contract Revision & Payment Terms Sign-off',
    nextActionDue: '2026-10-18T18:00:00Z',
    firstResponseAt: '2026-10-14T14:48:00Z',
    stageEnteredAt: '2026-10-16T10:00:00Z',
    notes: 'Legal department approved main master services agreement.',
    slaHours: 24,
    isOverdue: false,
  },
  {
    id: 'lead-104',
    fullName: 'Yasmine Sherif',
    companyName: 'Kemet Real Estate Developments',
    phone: '+20 111 678 9012',
    email: 'ysherif@kemetdev.com',
    status: 'contacted',
    journeyStage: 'onboarding',
    priority: 'high',
    assigneeId: 'u-3',
    assigneeName: 'Ahmed Tarek',
    assigneeRole: 'Brand Lead',
    assigneeAvatar: 'AT',
    serviceInterest: 'Launch Campaign Deliverables & Signage Kit',
    segment: 'Real Estate',
    source: 'Partner Event',
    createdAt: '2026-10-12T08:00:00Z',
    nextActionTitle: 'Kickoff Workshop & Creative Asset Ingestion',
    nextActionDue: '2026-10-19T11:00:00Z',
    firstResponseAt: '2026-10-12T08:30:00Z',
    stageEnteredAt: '2026-10-15T09:00:00Z',
    notes: 'Onboarding phase initiated. Client workspace created with member invites.',
    slaHours: 12,
    isOverdue: false,
  },
  {
    id: 'lead-105',
    fullName: 'Hassan Barakat',
    companyName: 'Barakat Logistics & Cargo',
    phone: '+20 101 223 3445',
    email: 'hassan@barakatlogistics.com',
    status: 'new',
    journeyStage: 'awareness',
    priority: 'medium',
    assigneeId: 'u-6',
    assigneeName: 'Youssef Karim',
    assigneeRole: 'Senior Project Manager',
    assigneeAvatar: 'YK',
    serviceInterest: 'Fleet Branding & Operations Guidelines',
    segment: 'Logistics',
    source: 'Website Inbound',
    createdAt: '2026-10-18T11:20:00Z',
    nextActionTitle: 'Verify Contact Credentials & Assign Account Lead',
    nextActionDue: '2026-10-18T15:00:00Z',
    firstResponseAt: null,
    stageEnteredAt: '2026-10-18T11:20:00Z',
    notes: 'Submitted inquiry 2 hours ago. Awaiting initial triage.',
    slaHours: 2,
    isOverdue: false,
  },
  {
    id: 'lead-106',
    fullName: 'Mona Radwan',
    companyName: 'Verve Retail & F&B Holdings',
    phone: '+20 120 556 6778',
    email: 'm.radwan@ververetail.com',
    status: 'converted',
    journeyStage: 'retention',
    priority: 'low',
    assigneeId: 'u-2',
    assigneeName: 'Sarah Mansour',
    assigneeRole: 'Client Success Manager',
    assigneeAvatar: 'SM',
    serviceInterest: 'Quarterly Design & Content Retainer',
    segment: 'Retail / FMCG',
    source: 'Direct Referral',
    createdAt: '2026-09-28T10:00:00Z',
    nextActionTitle: 'Monthly Retention Review & Milestone Delivery',
    nextActionDue: '2026-10-25T14:00:00Z',
    firstResponseAt: '2026-09-28T10:22:00Z',
    stageEnteredAt: '2026-10-05T09:00:00Z',
    notes: 'Retainer active. Client satisfaction index 98%.',
    slaHours: 48,
    isOverdue: false,
  },
]

export const INITIAL_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 'k-1',
    subject: 'Client Journey Onboarding Protocol v2',
    category: 'SOP & Operations',
    status: 'executed',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
    assignedUser: 'Ali Elsayed',
    assignedRole: 'Design Director',
  },
  {
    id: 'k-2',
    subject: 'First Response SLA & Escalation Rules',
    category: 'Customer Success',
    status: 'executed',
    startDate: '2026-10-05',
    endDate: '2026-10-18',
    assignedUser: 'Sarah Mansour',
    assignedRole: 'Client Success',
  },
  {
    id: 'k-3',
    subject: 'Technical Resolution Matrix for Identity Systems',
    category: 'Brand Architecture',
    status: 'in_progress',
    startDate: '2026-10-12',
    endDate: '2026-10-22',
    assignedUser: 'Ahmed Tarek',
    assignedRole: 'Brand Lead',
  },
  {
    id: 'k-4',
    subject: 'Client Feedback & Milestone Sign-off Playbook',
    category: 'Deliverables & Approvals',
    status: 'scheduled',
    startDate: '2026-10-20',
    endDate: '2026-11-01',
    assignedUser: 'Youssef Karim',
    assignedRole: 'Project Manager',
  },
]

export const INITIAL_DAILY_CHECKLIST: DailyChecklistItem[] = [
  {
    id: 'chk-1',
    textAr: 'All new leads recorded and assigned to a designated owner',
    textEn: 'All new leads recorded and assigned to a designated owner',
    completed: true,
    roleRequired: 'Team Lead / Admin',
  },
  {
    id: 'chk-2',
    textAr: 'Every customer interaction logged with outcome and next step',
    textEn: 'Every customer interaction logged with outcome and next step',
    completed: true,
    roleRequired: 'Account Lead / Sales',
  },
  {
    id: 'chk-3',
    textAr: 'Completed tasks closed; overdue items updated or escalated',
    textEn: 'Completed tasks closed; overdue items updated or escalated',
    completed: false,
    roleRequired: 'Operations / Lead',
  },
  {
    id: 'chk-4',
    textAr: 'Opt-out requests documented and promotional outreach stopped',
    textEn: 'Opt-out requests documented and promotional outreach stopped',
    completed: true,
    roleRequired: 'Client Success / Sales',
  },
  {
    id: 'chk-5',
    textAr: 'No active lead without assigned owner, clear status, and Cairo due date',
    textEn: 'No active lead without assigned owner, clear status, and Cairo due date',
    completed: false,
    roleRequired: 'Team Lead & Analyst',
  },
]

export const CRM_METRICS = {
  firstResponseTimeAvg: '38 mins',
  firstResponseTarget: '< 60 mins',
  conversionRate: '68.4%',
  conversionChange: '+4.2%',
  overdueTasksRate: '3.8%',
  overdueStatus: 'Under Control',
  averageStageAge: '2.4 days',
  dataCompleteness: '96.2%',
  activeLeadsCount: 18,
  unassignedCount: 1,
  todayInteractionsCount: 14,
}
