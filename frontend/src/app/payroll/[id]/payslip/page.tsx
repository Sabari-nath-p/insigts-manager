import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PropertyList, PropertyRow, Metric, MetricStrip } from '@/components/ui/property-row';
import type { Payslip } from '../../types';
import { PrintButton } from './print-button';

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, user } = await requireSession();
  const payslip = await apiFetch<Payslip>(`/payroll/me/${id}/payslip`, { token });

  return (
    <AppShell user={user}>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/payroll" className="flex items-center gap-1.5 text-sm text-muted hover:text-text">
          <ArrowLeft size={14} />
          Back to My Payroll
        </Link>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-2xl rounded-lg border border-border bg-surface p-8">
        <div className="mb-6 flex items-start justify-between border-b border-border pb-6">
          <div>
            <h1 className="text-xl font-bold text-text">Payslip</h1>
            <p className="mt-1 text-sm text-muted">{formatMonth(payslip.payrollMonth)}</p>
          </div>
          <p className="text-sm font-medium capitalize text-text">{payslip.paymentStatus}</p>
        </div>

        <PropertyList className="mb-6">
          <PropertyRow label="Employee" value={payslip.employeeName} />
          <PropertyRow label="Employee ID" value={payslip.employeeId} />
          {payslip.designation && <PropertyRow label="Designation" value={payslip.designation} />}
          {payslip.department && <PropertyRow label="Department" value={payslip.department} />}
        </PropertyList>

        <MetricStrip className="mb-6">
          <Metric label="Working days" value={payslip.workingDays} />
          <Metric label="Scheduled hours" value={payslip.scheduledHours} />
          <Metric label="Actual hours" value={payslip.actualHours} />
          <Metric label="Payable hours" value={payslip.payableHours} />
          <Metric label="Extra hours" value={payslip.extraHours} />
        </MetricStrip>

        <PropertyList>
          <PropertyRow label="Base payroll amount" value={`₹${Number(payslip.baseSalaryEarned).toLocaleString('en-IN')}`} />
          {payslip.approvedAdditions.map((a, i) => (
            <PropertyRow key={`add-${i}`} label={`+ ${a.reason}`} value={`₹${Number(a.amount).toLocaleString('en-IN')}`} />
          ))}
          {payslip.approvedDeductions.map((a, i) => (
            <PropertyRow key={`ded-${i}`} label={`− ${a.reason}`} value={`−₹${Number(a.amount).toLocaleString('en-IN')}`} />
          ))}
        </PropertyList>

        <div className="mt-4 flex items-center justify-between rounded-md bg-black/[0.03] px-4 py-3 dark:bg-white/[0.05]">
          <span className="text-sm font-semibold text-text">Final payable amount</span>
          <span className="text-lg font-bold text-text">₹{Number(payslip.finalPayableAmount).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </AppShell>
  );
}

function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
