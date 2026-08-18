'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Field, FieldRow, Input, Select, Textarea, ErrorText } from '@/components/ui/field';
import { LEAD_STATUSES, LOSS_REASONS, MEETING_STATUSES, SALE_TYPES, type Lead, type LeadSource, type SalesTeamMember } from '../../types';
import { LOSS_REASON_LABELS, MEETING_STATUS_LABELS, STATUS_LABELS } from '@/lib/crm-format';

interface UserOption {
  id: string;
  fullName: string;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function toDateTimeInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditLeadPanel({
  lead,
  sources,
  team,
  users,
}: {
  lead: Lead;
  sources: LeadSource[];
  team: SalesTeamMember[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userById = new Map(users.map((u) => [u.id, u]));
  const setters = team.filter((t) => t.salesRole === 'setter').map((t) => userById.get(t.userId)).filter((u): u is UserOption => !!u);
  const closers = team.filter((t) => t.salesRole === 'closer').map((t) => userById.get(t.userId)).filter((u): u is UserOption => !!u);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const str = (name: string) => (fd.get(name) as string) || undefined;
    const num = (name: string) => {
      const v = fd.get(name) as string;
      return v === '' || v == null ? undefined : Number(v);
    };
    const iso = (name: string) => {
      const v = fd.get(name) as string;
      return v ? new Date(v).toISOString() : undefined;
    };

    const payload = {
      leadName: str('leadName'),
      companyName: str('companyName'),
      email: str('email'),
      phone: str('phone'),
      whatsapp: str('whatsapp'),
      leadSourceId: str('leadSourceId'),
      setterId: str('setterId'),
      closerId: str('closerId'),
      status: str('status'),
      firstContactAt: iso('firstContactAt'),
      meetingBookedAt: iso('meetingBookedAt'),
      meetingDate: str('meetingDate'),
      meetingTime: str('meetingTime'),
      lastTouchAt: iso('lastTouchAt'),
      nextFollowUpDate: str('nextFollowUpDate'),
      depositPaidAt: str('depositPaidAt'),
      paidInFullAt: str('paidInFullAt'),
      meetingStatus: str('meetingStatus'),
      meetingLink: str('meetingLink'),
      meetingNotes: str('meetingNotes'),
      rescheduledDate: str('rescheduledDate'),
      cancellationReason: str('cancellationReason'),
      dqReason: str('dqReason'),
      offerMade: fd.get('offerMade') === 'true' ? true : fd.get('offerMade') === 'false' ? false : undefined,
      saleType: str('saleType'),
      lossReason: str('lossReason'),
      lossNotes: str('lossNotes'),
      depositAmount: num('depositAmount'),
      dealValue: num('dealValue'),
      cashCollected: num('cashCollected'),
      refundAmount: num('refundAmount'),
      commissionOverridePercent: num('commissionOverridePercent'),
      followUpNotes: str('followUpNotes'),
    };

    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save');
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Edit Lead
      </Button>
      <Panel open={open} onOpenChange={setOpen} title="Edit Lead" description={lead.leadName}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && <ErrorText>{error}</ErrorText>}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Contact</p>
            <div className="flex flex-col gap-3">
              <Field label="Lead name" htmlFor="leadName">
                <Input id="leadName" name="leadName" defaultValue={lead.leadName} required />
              </Field>
              <Field label="Company" htmlFor="companyName">
                <Input id="companyName" name="companyName" defaultValue={lead.companyName ?? ''} />
              </Field>
              <FieldRow>
                <Field label="Email" htmlFor="email">
                  <Input id="email" name="email" type="email" defaultValue={lead.email ?? ''} />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <Input id="phone" name="phone" defaultValue={lead.phone ?? ''} />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="WhatsApp" htmlFor="whatsapp">
                  <Input id="whatsapp" name="whatsapp" defaultValue={lead.whatsapp ?? ''} />
                </Field>
                <Field label="Source" htmlFor="leadSourceId">
                  <Select id="leadSourceId" name="leadSourceId" defaultValue={lead.leadSourceId ?? ''}>
                    <option value="">—</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="Setter" htmlFor="setterId">
                  <Select id="setterId" name="setterId" defaultValue={lead.setterId ?? ''}>
                    <option value="">—</option>
                    {setters.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Closer" htmlFor="closerId">
                  <Select id="closerId" name="closerId" defaultValue={lead.closerId ?? ''}>
                    <option value="">—</option>
                    {closers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FieldRow>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Status &amp; dates</p>
            <div className="flex flex-col gap-3">
              <Field label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue={lead.status}>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <FieldRow>
                <Field label="First contact" htmlFor="firstContactAt">
                  <Input id="firstContactAt" name="firstContactAt" type="datetime-local" defaultValue={toDateTimeInputValue(lead.firstContactAt)} />
                </Field>
                <Field label="Last touch" htmlFor="lastTouchAt">
                  <Input id="lastTouchAt" name="lastTouchAt" type="datetime-local" defaultValue={toDateTimeInputValue(lead.lastTouchAt)} />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="Meeting booked" htmlFor="meetingBookedAt">
                  <Input id="meetingBookedAt" name="meetingBookedAt" type="datetime-local" defaultValue={toDateTimeInputValue(lead.meetingBookedAt)} />
                </Field>
                <Field label="Next follow-up" htmlFor="nextFollowUpDate">
                  <Input id="nextFollowUpDate" name="nextFollowUpDate" type="date" defaultValue={toDateInputValue(lead.nextFollowUpDate)} />
                </Field>
              </FieldRow>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Meeting</p>
            <div className="flex flex-col gap-3">
              <FieldRow>
                <Field label="Meeting date" htmlFor="meetingDate">
                  <Input id="meetingDate" name="meetingDate" type="date" defaultValue={toDateInputValue(lead.meetingDate)} />
                </Field>
                <Field label="Meeting time" htmlFor="meetingTime">
                  <Input id="meetingTime" name="meetingTime" type="time" defaultValue={lead.meetingTime ?? ''} />
                </Field>
              </FieldRow>
              <Field label="Meeting link" htmlFor="meetingLink">
                <Input id="meetingLink" name="meetingLink" defaultValue={lead.meetingLink ?? ''} />
              </Field>
              <Field label="Meeting status" htmlFor="meetingStatus">
                <Select id="meetingStatus" name="meetingStatus" defaultValue={lead.meetingStatus ?? ''}>
                  <option value="">—</option>
                  {MEETING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {MEETING_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Meeting notes" htmlFor="meetingNotes">
                <Textarea id="meetingNotes" name="meetingNotes" rows={2} defaultValue={lead.meetingNotes ?? ''} />
              </Field>
              <FieldRow>
                <Field label="Rescheduled date" htmlFor="rescheduledDate">
                  <Input id="rescheduledDate" name="rescheduledDate" type="date" defaultValue={toDateInputValue(lead.rescheduledDate)} />
                </Field>
                <Field label="Cancellation reason" htmlFor="cancellationReason">
                  <Input id="cancellationReason" name="cancellationReason" defaultValue={lead.cancellationReason ?? ''} />
                </Field>
              </FieldRow>
              <Field label="DQ reason" htmlFor="dqReason">
                <Input id="dqReason" name="dqReason" defaultValue={lead.dqReason ?? ''} />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Call outcome</p>
            <FieldRow>
              <Field label="Offer made" htmlFor="offerMade">
                <Select id="offerMade" name="offerMade" defaultValue={lead.offerMade == null ? '' : String(lead.offerMade)}>
                  <option value="">—</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </Field>
              <Field label="Sale type" htmlFor="saleType">
                <Select id="saleType" name="saleType" defaultValue={lead.saleType ?? ''}>
                  <option value="">—</option>
                  {SALE_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {s === 'one_call' ? '1-Call Sale' : 'Follow-Up Sale'}
                    </option>
                  ))}
                </Select>
              </Field>
            </FieldRow>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Loss (required if marking Lost)</p>
            <div className="flex flex-col gap-3">
              <Field label="Loss reason" htmlFor="lossReason">
                <Select id="lossReason" name="lossReason" defaultValue={lead.lossReason ?? ''}>
                  <option value="">—</option>
                  {LOSS_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {LOSS_REASON_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Loss notes" htmlFor="lossNotes">
                <Textarea id="lossNotes" name="lossNotes" rows={2} defaultValue={lead.lossNotes ?? ''} />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Money (required if marking Won)</p>
            <div className="flex flex-col gap-3">
              <FieldRow>
                <Field label="Deal value (₹)" htmlFor="dealValue">
                  <Input id="dealValue" name="dealValue" type="number" min={0} step="0.01" defaultValue={lead.dealValue || ''} />
                </Field>
                <Field label="Deposit amount (₹)" htmlFor="depositAmount">
                  <Input id="depositAmount" name="depositAmount" type="number" min={0} step="0.01" defaultValue={lead.depositAmount} />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="Cash collected (₹)" htmlFor="cashCollected">
                  <Input id="cashCollected" name="cashCollected" type="number" min={0} step="0.01" defaultValue={lead.cashCollected} />
                </Field>
                <Field label="Refund / clawback (₹)" htmlFor="refundAmount">
                  <Input id="refundAmount" name="refundAmount" type="number" min={0} step="0.01" defaultValue={lead.refundAmount || ''} />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="Deposit paid on" htmlFor="depositPaidAt">
                  <Input id="depositPaidAt" name="depositPaidAt" type="date" defaultValue={toDateInputValue(lead.depositPaidAt)} />
                </Field>
                <Field label="Paid in full on" htmlFor="paidInFullAt">
                  <Input id="paidInFullAt" name="paidInFullAt" type="date" defaultValue={toDateInputValue(lead.paidInFullAt)} />
                </Field>
              </FieldRow>
              <Field label="Commission override %" htmlFor="commissionOverridePercent" hint="Leave blank to use the resolved rule-based rate. Every change is audit logged.">
                <Input
                  id="commissionOverridePercent"
                  name="commissionOverridePercent"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  defaultValue={lead.commissionOverridePercent ?? ''}
                />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Follow-up</p>
            <Field label="Follow-up notes" htmlFor="followUpNotes">
              <Textarea id="followUpNotes" name="followUpNotes" rows={2} defaultValue={lead.followUpNotes ?? ''} />
            </Field>
          </div>

          <Button type="submit" disabled={loading} className="self-start">
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Panel>
    </>
  );
}
