'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FieldRow, Input, Select, CheckboxLabel, ErrorText } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { HOLIDAY_TYPES, Holiday } from './holiday-types';

export function HolidayForm({
  holiday,
  departments,
  onDone,
}: {
  holiday: Holiday | null; // null = creating a new holiday
  departments: string[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicableDepartments, setApplicableDepartments] = useState<string[]>(holiday?.applicableDepartments ?? []);

  function toggleDepartment(dept: string) {
    setApplicableDepartments((prev) => (prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      date: form.get('date'),
      name: form.get('name'),
      type: form.get('type'),
      description: (form.get('description') as string) || undefined,
      isPaid: form.get('isPaid') === 'on',
      isOptional: form.get('isOptional') === 'on',
      isTentative: form.get('isTentative') === 'on',
      applicableDepartments: applicableDepartments.length ? applicableDepartments : undefined,
      isActive: form.get('isActive') === 'on',
    };
    try {
      const url = holiday ? `/api/attendance/holidays/${holiday.id}` : '/api/attendance/holidays';
      const res = await fetch(url, {
        method: holiday ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to save holiday');
      }
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="my-3 rounded-md border border-border p-4">
      {error && <ErrorText>{error}</ErrorText>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldRow>
          <Field label="Holiday name" htmlFor="holiday-name">
            <Input id="holiday-name" name="name" type="text" placeholder="e.g. Independence Day" defaultValue={holiday?.name} required />
          </Field>
          <Field label="Date" htmlFor="holiday-date">
            <Input id="holiday-date" name="date" type="date" defaultValue={holiday?.date} required />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Holiday type" htmlFor="holiday-type">
            <Select id="holiday-type" name="type" defaultValue={holiday?.type ?? 'public_holiday'}>
              {HOLIDAY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description" htmlFor="holiday-description">
            <Input id="holiday-description" name="description" type="text" placeholder="Optional notes" defaultValue={holiday?.description ?? ''} />
          </Field>
        </FieldRow>

        <Field label="Applicable employees">
          {departments.length === 0 ? (
            <p className="text-sm text-muted">No departments configured yet — this holiday will apply to everyone.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <CheckboxLabel checked={applicableDepartments.length === 0} onChange={() => setApplicableDepartments([])} className="font-semibold">
                All employees
              </CheckboxLabel>
              {departments.map((dept) => (
                <CheckboxLabel key={dept} checked={applicableDepartments.includes(dept)} onChange={() => toggleDepartment(dept)}>
                  {dept}
                </CheckboxLabel>
              ))}
            </div>
          )}
        </Field>

        <div className="flex flex-wrap gap-3">
          <CheckboxLabel name="isPaid" defaultChecked={holiday?.isPaid ?? true}>
            Paid
          </CheckboxLabel>
          <CheckboxLabel name="isOptional" defaultChecked={holiday?.isOptional ?? false}>
            Optional (not compulsory)
          </CheckboxLabel>
          <CheckboxLabel name="isTentative" defaultChecked={holiday?.isTentative ?? false}>
            Tentative (subject to confirmation)
          </CheckboxLabel>
          <CheckboxLabel name="isActive" defaultChecked={holiday?.isActive ?? true}>
            Active
          </CheckboxLabel>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : holiday ? 'Save changes' : 'Add holiday'}
          </Button>
          <Button type="button" variant="secondary" onClick={onDone} disabled={loading}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
