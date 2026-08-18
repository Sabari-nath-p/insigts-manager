import Link from 'next/link';
import { ArrowLeft, Phone, MessageCircle, Mail } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { PropertyList, PropertyRow, Metric, MetricStrip } from '@/components/ui/property-row';
import { Pill } from '@/components/ui/pill';
import type { Lead, LeadActivity, LeadSource, SalesTeamMember } from '../../types';
import {
  AGING_LABELS,
  LOSS_REASON_LABELS,
  MEETING_STATUS_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
} from '@/lib/crm-format';
import { EditLeadPanel } from './edit-lead-panel';
import { ActivityFeed } from './activity-feed';
import { ConvertToClientButton } from './convert-to-client-button';

interface UserSummary {
  id: string;
  fullName: string;
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, user } = await requireSession();

  const [lead, activities, sources, team, users] = await Promise.all([
    apiFetch<Lead>(`/crm/leads/${id}`, { token }),
    apiFetch<LeadActivity[]>(`/crm/leads/${id}/activity`, { token }),
    apiFetch<LeadSource[]>('/crm/sources', { token }),
    apiFetch<SalesTeamMember[]>('/crm/team', { token }),
    apiFetch<UserSummary[]>('/users/team/status', { token }),
  ]);

  const nameById = new Map(users.map((u) => [u.id, u.fullName]));
  const sourceName = sources.find((s) => s.id === lead.leadSourceId)?.name;

  return (
    <AppShell user={user}>
      <Link href="/crm/leads" className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft size={14} />
        Back to Lead Log
      </Link>

      <PageHeader
        title={lead.leadName}
        subtitle={lead.companyName ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Pill tone={STATUS_TONE[lead.status]}>{STATUS_LABELS[lead.status]}</Pill>
            <EditLeadPanel lead={lead} sources={sources} team={team} users={users} />
          </div>
        }
      />

      {lead.agingStatus && (
        <div className="mb-6 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm font-semibold text-danger">
          {AGING_LABELS[lead.agingStatus]}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.06]">
            <Phone size={14} /> Call
          </a>
        )}
        {lead.whatsapp && (
          <a
            href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.06]">
            <Mail size={14} /> Email
          </a>
        )}
      </div>

      <SectionTitle>Contact</SectionTitle>
      <PropertyList className="mb-8">
        <PropertyRow label="Email" value={lead.email ?? '—'} />
        <PropertyRow label="Phone" value={lead.phone ?? '—'} />
        <PropertyRow label="WhatsApp" value={lead.whatsapp ?? '—'} />
        <PropertyRow label="Source" value={sourceName ?? '—'} />
        <PropertyRow label="Setter" value={lead.setterId ? nameById.get(lead.setterId) ?? '—' : '—'} />
        <PropertyRow label="Closer" value={lead.closerId ? nameById.get(lead.closerId) ?? '—' : '—'} />
      </PropertyList>

      <SectionTitle>Dates</SectionTitle>
      <PropertyList className="mb-8">
        <PropertyRow label="Created" value={formatDateTime(lead.createdAt)} />
        <PropertyRow label="First contact" value={formatDateTime(lead.firstContactAt)} />
        <PropertyRow label="Speed to lead" value={lead.speedToLeadMinutes != null ? `${lead.speedToLeadMinutes} min` : '—'} />
        <PropertyRow label="Meeting booked" value={formatDateTime(lead.meetingBookedAt)} />
        <PropertyRow label="Meeting date" value={lead.meetingDate ? `${formatDateOnly(lead.meetingDate)} ${lead.meetingTime ?? ''}` : '—'} />
        <PropertyRow label="Booking lag" value={lead.bookingLagDays != null ? `${lead.bookingLagDays} day(s)` : '—'} />
        <PropertyRow label="Last touch" value={formatDateTime(lead.lastTouchAt)} />
        <PropertyRow label="Next follow-up" value={formatDateOnly(lead.nextFollowUpDate)} />
        <PropertyRow label="Won" value={formatDateTime(lead.wonAt)} />
        <PropertyRow label="Lost" value={formatDateTime(lead.lostAt)} />
      </PropertyList>

      <SectionTitle>Meeting</SectionTitle>
      <PropertyList className="mb-8">
        <PropertyRow label="Status" value={lead.meetingStatus ? MEETING_STATUS_LABELS[lead.meetingStatus] : '—'} />
        <PropertyRow label="Link" value={lead.meetingLink ? <a href={lead.meetingLink} className="text-primary hover:text-primary-dark">{lead.meetingLink}</a> : '—'} />
        <PropertyRow label="Notes" value={lead.meetingNotes ?? '—'} />
        {lead.meetingStatus === 'dq' && <PropertyRow label="DQ reason" value={lead.dqReason ?? '—'} />}
        {(lead.meetingStatus === 'rescheduled_by_us' || lead.meetingStatus === 'rescheduled_by_them') && (
          <PropertyRow label="Rescheduled date" value={formatDateOnly(lead.rescheduledDate)} />
        )}
        {lead.meetingStatus === 'cancel' && <PropertyRow label="Cancellation reason" value={lead.cancellationReason ?? '—'} />}
      </PropertyList>

      <SectionTitle>Call outcome</SectionTitle>
      <PropertyList className="mb-8">
        <PropertyRow label="Offer made" value={lead.offerMade == null ? '—' : lead.offerMade ? 'Yes' : 'No'} />
        <PropertyRow label="Sale type" value={lead.saleType === 'one_call' ? '1-Call Sale' : lead.saleType === 'follow_up' ? 'Follow-Up Sale' : '—'} />
      </PropertyList>

      {lead.status === 'lost' && (
        <>
          <SectionTitle>Loss</SectionTitle>
          <PropertyList className="mb-8">
            <PropertyRow label="Reason" value={lead.lossReason ? LOSS_REASON_LABELS[lead.lossReason] : '—'} />
            <PropertyRow label="Notes" value={lead.lossNotes ?? '—'} />
          </PropertyList>
        </>
      )}

      <SectionTitle>Money</SectionTitle>
      <MetricStrip className="mb-3">
        <Metric label="Deal value" value={formatCurrency(lead.dealValue)} />
        <Metric label="Deposit" value={formatCurrency(lead.depositAmount)} />
        <Metric label="Cash collected" value={formatCurrency(lead.cashCollected)} />
        <Metric label="Refund" value={formatCurrency(lead.refundAmount)} />
        <Metric label="Net revenue" value={formatCurrency(lead.netRevenue)} />
      </MetricStrip>
      <PropertyList className="mb-8">
        <PropertyRow label="Commission %" value={`${lead.resolvedCommissionPercent}%${lead.commissionOverridePercent != null ? ' (override)' : ''}`} />
        <PropertyRow label="Earnings" value={<span className="font-semibold">{formatCurrency(lead.earnings)}</span>} />
        <PropertyRow label="Deposit paid" value={formatDateOnly(lead.depositPaidAt)} />
        <PropertyRow label="Paid in full" value={formatDateOnly(lead.paidInFullAt)} />
      </PropertyList>

      <SectionTitle>Follow-up</SectionTitle>
      <PropertyList className="mb-8">
        <PropertyRow label="Notes" value={lead.followUpNotes ?? '—'} />
        <PropertyRow label="Follow-up count" value={lead.followUpCount} />
      </PropertyList>

      {lead.status === 'won' && (
        <>
          <SectionTitle>Client</SectionTitle>
          <div className="mb-8">
            {lead.clientId ? (
              <Link href={`/clients/${lead.clientId}`} className="text-sm font-medium text-primary hover:text-primary-dark">
                View client record →
              </Link>
            ) : (
              <ConvertToClientButton leadId={lead.id} />
            )}
          </div>
        </>
      )}

      <SectionTitle>Activity timeline</SectionTitle>
      <ActivityFeed leadId={lead.id} activities={activities} />
    </AppShell>
  );
}
