export const LEAD_STATUSES = ['new', 'proposal', 'deposit', 'follow_up_ongoing', 'meeting_follow_up', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const MEETING_STATUSES = ['show', 'no_show', 'rescheduled_by_us', 'rescheduled_by_them', 'cancel', 'dq'] as const;
export const SALE_TYPES = ['one_call', 'follow_up'] as const;
export const LOSS_REASONS = ['price', 'timing', 'partner_spouse', 'competitor', 'ghosted', 'not_qualified'] as const;
export const ACTIVITY_TYPES = [
  'call',
  'whatsapp',
  'email',
  'instagram_dm',
  'meeting',
  'follow_up',
  'proposal_sent',
  'payment_request',
  'note',
  'other',
] as const;

export interface Lead {
  id: string;
  leadName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  leadSourceId: string | null;
  setterId: string | null;
  closerId: string | null;
  status: LeadStatus;
  isArchived: boolean;

  firstContactAt: string | null;
  meetingBookedAt: string | null;
  meetingDate: string | null;
  meetingTime: string | null;
  lastTouchAt: string | null;
  nextFollowUpDate: string | null;
  wonAt: string | null;
  lostAt: string | null;
  depositPaidAt: string | null;
  paidInFullAt: string | null;

  meetingStatus: string | null;
  meetingLink: string | null;
  meetingNotes: string | null;
  rescheduledDate: string | null;
  cancellationReason: string | null;
  dqReason: string | null;

  offerMade: boolean | null;
  saleType: string | null;

  lossReason: string | null;
  lossNotes: string | null;

  depositAmount: string;
  cashCollected: string;
  refundAmount: number;
  dealValue: number;
  netRevenue: number;
  resolvedCommissionPercent: number;
  earnings: number;
  commissionOverridePercent: string | null;

  followUpNotes: string | null;
  followUpCount: number;

  clientId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  agingStatus: 'follow_up_aging' | 'deposit_aging' | 'booking_lag' | 'no_contact' | null;
  bookingLagDays: number | null;
  speedToLeadMinutes: number | null;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  actorId: string;
  type: string;
  description: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface LeadSource {
  id: string;
  name: string;
  isActive: boolean;
}

export interface SalesTeamMember {
  id: string;
  userId: string;
  salesRole: 'setter' | 'closer' | 'sales_manager';
  isActive: boolean;
}

export interface CommissionRule {
  id: string;
  scope: 'default' | 'role' | 'employee';
  salesRole: 'setter' | 'closer' | null;
  userId: string | null;
  percent: string;
}

export interface DailySalesActivity {
  id: string;
  userId: string;
  date: string;
  dials: number;
  dmsSent: number;
  conversations: number;
  notes: string | null;
}

export interface KanbanColumn {
  status: LeadStatus;
  leads: Lead[];
}

export interface KanbanBoard {
  columns: KanbanColumn[];
  summary: {
    totalLeads: number;
    counts: Record<string, number>;
    pipelineValue: number;
    wonRevenue: number;
  };
}
