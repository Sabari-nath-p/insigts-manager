'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Field, FieldRow, Input, Select, Textarea, ErrorText } from '@/components/ui/field';
import { PropertyList, PropertyRow } from '@/components/ui/property-row';
import type { EmployeeCompensation } from '../types';

export function CompensationPanel({
  userId,
  fullName,
  history,
}: {
  userId: string;
  fullName: string;
  history: EmployeeCompensation[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = history[0];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/payroll/admin/compensation/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlySalary: Number(form.get('monthlySalary')),
          standardWorkingHoursPerDay: Number(form.get('standardWorkingHoursPerDay')),
          payrollStatus: form.get('payrollStatus'),
          effectiveFrom: form.get('effectiveFrom'),
          notes: form.get('notes') || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save compensation');
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
      <button onClick={() => setOpen(true)} className="text-xs font-medium text-primary hover:text-primary-dark">
        {current ? 'Update salary' : 'Set salary'}
      </button>
      <Panel open={open} onOpenChange={setOpen} title={fullName} description="Effective-dated salary & payroll configuration">
        <div className="flex flex-col gap-6">
          {error && <ErrorText>{error}</ErrorText>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FieldRow>
              <Field label="Monthly salary (₹)" htmlFor="monthlySalary">
                <Input
                  id="monthlySalary"
                  name="monthlySalary"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={current?.monthlySalary}
                  required
                />
              </Field>
              <Field label="Standard working hours/day" htmlFor="standardWorkingHoursPerDay">
                <Input
                  id="standardWorkingHoursPerDay"
                  name="standardWorkingHoursPerDay"
                  type="number"
                  min={0.5}
                  step="0.5"
                  defaultValue={current?.standardWorkingHoursPerDay ?? 8}
                  required
                />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="Payroll status" htmlFor="payrollStatus">
                <Select id="payrollStatus" name="payrollStatus" defaultValue={current?.payrollStatus ?? 'active'}>
                  <option value="active">Active</option>
                  <option value="on_hold">On hold</option>
                  <option value="excluded">Excluded</option>
                </Select>
              </Field>
              <Field label="Effective from" htmlFor="effectiveFrom">
                <Input id="effectiveFrom" name="effectiveFrom" type="date" required />
              </Field>
            </FieldRow>
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" rows={2} placeholder="e.g. Annual increment" />
            </Field>
            <Button type="submit" disabled={loading} className="self-start">
              {loading ? 'Saving…' : 'Save'}
            </Button>
          </form>

          {history.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">History</p>
              <PropertyList>
                {history.map((c) => (
                  <PropertyRow
                    key={c.id}
                    label={`${c.effectiveFrom} → ${c.effectiveTo ?? 'current'}`}
                    value={`₹${Number(c.monthlySalary).toLocaleString('en-IN')} · ${c.standardWorkingHoursPerDay}h/day · ${c.payrollStatus}`}
                  />
                ))}
              </PropertyList>
            </div>
          )}
        </div>
      </Panel>
    </>
  );
}
