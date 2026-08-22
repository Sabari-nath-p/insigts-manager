'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Field, FieldRow, Input, ErrorText } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';

// Must match the backend's APP_TIMEZONE (attendance-calculations.ts). The value this produces
// is submitted back as a plain "YYYY-MM-DDTHH:mm" string with no timezone info, and the backend
// re-interprets it as this same zone — so the picker has to show IST regardless of the admin's
// own machine timezone, or a round-trip edit (open, save with no changes) would shift the time.
// Sourced from NEXT_PUBLIC_APP_TIMEZONE, the same variable attendance-format.ts reads, so both
// stay in sync with the backend's APP_TIMEZONE via one deployment config.
const DISPLAY_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Asia/Kolkata';

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function EditAttendanceButton({
  recordId,
  date,
  checkInAt,
  checkOutAt,
  breakMinutes,
}: {
  recordId: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  breakMinutes: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const checkIn = form.get('checkInAt') as string;
    const checkOut = form.get('checkOutAt') as string;
    const payload: Record<string, unknown> = {
      date: form.get('date'),
      checkInAt: checkIn ? checkIn : null,
      checkOutAt: checkOut ? checkOut : null,
      totalBreakMinutes: Number(form.get('totalBreakMinutes') || 0),
    };
    try {
      const res = await fetch(`/api/attendance/admin/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to update record');
      }
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded p-1 text-muted opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
        aria-label="Edit record"
      >
        <Pencil size={14} />
      </button>
      <Panel open={open} onOpenChange={setOpen} title="Edit attendance record" description={date}>
        {error && <ErrorText>{error}</ErrorText>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldRow>
            <Field label="Date" htmlFor={`date-${recordId}`}>
              <Input id={`date-${recordId}`} name="date" type="date" defaultValue={date} required />
            </Field>
            <Field label="Break minutes" htmlFor={`break-${recordId}`}>
              <Input id={`break-${recordId}`} name="totalBreakMinutes" type="number" min={0} defaultValue={breakMinutes} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Clock in" htmlFor={`checkin-${recordId}`}>
              <Input id={`checkin-${recordId}`} name="checkInAt" type="datetime-local" defaultValue={toDatetimeLocal(checkInAt)} />
            </Field>
            <Field label="Clock out" htmlFor={`checkout-${recordId}`}>
              <Input id={`checkout-${recordId}`} name="checkOutAt" type="datetime-local" defaultValue={toDatetimeLocal(checkOutAt)} />
            </Field>
          </FieldRow>
          <p className="text-xs text-muted">
            Worked hours, late, early-checkout and overtime are recalculated automatically from these values.
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save correction'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}
