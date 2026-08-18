import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { PropertyList, PropertyRow, Metric, MetricStrip } from '@/components/ui/property-row';
import { Pill } from '@/components/ui/pill';
import type { BadgeKey } from '@/lib/attendance-format';
import type { AdminPayrollRecord, PayrollAdjustment, PayrollAuditLogEntry } from '../types';
import { RecordActions } from './record-actions';
import { AdjustmentsPanel } from './adjustments-panel';

const STATUS_TONE: Record<string, BadgeKey> = {
  calculated: 'badgeGray',
  under_review: 'badgeYellow',
  approved: 'badgeBlue',
  finalized: 'badgeGreen',
};

export default async function AdminPayrollRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, user } = await requireSuperAdmin();

  const [detail, audit] = await Promise.all([
    apiFetch<{ record: AdminPayrollRecord; fullName: string; adjustments: PayrollAdjustment[] }>(`/payroll/admin/records/${id}`, {
      token,
    }),
    apiFetch<PayrollAuditLogEntry[]>(`/payroll/admin/records/${id}/audit`, { token }),
  ]);
  const { record, fullName, adjustments } = detail;
  const locked = record.status === 'finalized';

  return (
    <AppShell user={user}>
      <Link href="/admin/payroll" className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft size={14} />
        Back to Payroll
      </Link>

      <PageHeader
        title={fullName}
        subtitle={formatMonth(record.payrollMonth)}
        actions={
          <div className="flex items-center gap-2">
            <Pill tone={STATUS_TONE[record.status] ?? 'badgeGray'}>{record.status.replace('_', ' ')}</Pill>
            <Pill tone={record.paymentStatus === 'paid' ? 'badgeGreen' : 'badgeYellow'}>{record.paymentStatus}</Pill>
          </div>
        }
      />

      {record.exceptions && record.exceptions.length > 0 && (
        <div className="mb-6 rounded-md border border-danger/30 bg-danger-bg p-3">
          <p className="mb-1.5 text-sm font-semibold text-danger">{record.exceptions.length} payroll exception(s)</p>
          <ul className="list-inside list-disc text-sm text-danger">
            {record.exceptions.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      <SectionTitle>Actions</SectionTitle>
      <div className="mb-8">
        <RecordActions
          recordId={record.id}
          status={record.status}
          hasExceptions={(record.exceptions?.length ?? 0) > 0}
          paymentStatus={record.paymentStatus}
        />
      </div>

      <SectionTitle>Period</SectionTitle>
      <MetricStrip className="mb-8">
        <Metric label="Calendar days" value={record.calendarDays} />
        <Metric label="Weekly offs" value={record.weeklyOffDays} />
        <Metric label="Holidays" value={record.holidayDays} />
        <Metric label="Working days" value={record.workingDays} />
        <Metric label="Standard hrs/day" value={record.standardHoursPerDay} />
        <Metric label="Scheduled hrs" value={(record.scheduledMinutes / 60).toFixed(1)} />
      </MetricStrip>

      <SectionTitle>Attendance</SectionTitle>
      <MetricStrip className="mb-8">
        <Metric label="Actual hrs" value={(record.actualWorkedMinutes / 60).toFixed(1)} />
        <Metric label="Payable hrs" value={(record.payableMinutes / 60).toFixed(1)} />
        <Metric label="Extra hrs" value={(record.extraMinutes / 60).toFixed(1)} />
        <Metric label="Paid leave days" value={record.paidLeaveDays} />
        <Metric label="Medical leave days" value={record.medicalLeaveDays} />
        <Metric label="Unpaid leave days" value={record.unpaidLeaveDays} />
      </MetricStrip>

      <SectionTitle>Payroll calculation (internal — never shown to the employee)</SectionTitle>
      <PropertyList className="mb-8">
        <PropertyRow label="Monthly salary used" value={`₹${Number(record.monthlySalaryUsed).toLocaleString('en-IN')}`} />
        <PropertyRow label="Internal hourly rate" value={`₹${Number(record.internalHourlyRate).toFixed(2)}/hr`} />
        <PropertyRow label="Base salary earned" value={`₹${Number(record.baseSalaryEarned).toLocaleString('en-IN')}`} />
        <PropertyRow label="Additions" value={`+₹${Number(record.additionsTotal).toLocaleString('en-IN')}`} />
        <PropertyRow label="Deductions" value={`−₹${Number(record.deductionsTotal).toLocaleString('en-IN')}`} />
        <PropertyRow
          label="Final payable amount"
          value={<span className="text-base font-semibold">₹{Number(record.finalPayableAmount).toLocaleString('en-IN')}</span>}
        />
      </PropertyList>

      <SectionTitle>Adjustments</SectionTitle>
      <div className="mb-8">
        <AdjustmentsPanel recordId={record.id} adjustments={adjustments} locked={locked} />
      </div>

      <SectionTitle>Audit trail</SectionTitle>
      <PropertyList>
        {audit.map((a) => (
          <PropertyRow
            key={a.id}
            label={new Date(a.changedAt).toLocaleString()}
            value={
              <>
                <span className="capitalize">{a.action.replace('_', ' ')}</span>
                {a.reason && <span className="text-muted"> — {a.reason}</span>}
              </>
            }
          />
        ))}
        {audit.length === 0 && <p className="py-2 text-sm text-muted">No audit history yet.</p>}
      </PropertyList>
    </AppShell>
  );
}

function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
