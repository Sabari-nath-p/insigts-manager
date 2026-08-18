'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FieldRow, Input, CheckboxLabel, ErrorText } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

export interface AttendanceSettings {
  workStartTime: string;
  workEndTime: string;
  requiredMinutesPerDay: number;
  lateGraceMinutes: number;
  earlyCheckoutGraceMinutes: number;
  workingDays: string[];
  weeklyOffDays: string[];
  secondSaturdayOff: boolean;
  breakDurationMinutes: number;
  halfDayThresholdMinutes: number;
  overtimeThresholdMinutes: number;
  flexibleWorkingEnabled: boolean;
}

const WEEK_DAYS: Array<{ value: string; label: string }> = [
  { value: 'MON', label: 'Mon' },
  { value: 'TUE', label: 'Tue' },
  { value: 'WED', label: 'Wed' },
  { value: 'THU', label: 'Thu' },
  { value: 'FRI', label: 'Fri' },
  { value: 'SAT', label: 'Sat' },
  { value: 'SUN', label: 'Sun' },
];

function DayCheckboxes({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (days: string[]) => void;
}) {
  function toggle(day: string) {
    onChange(selected.includes(day) ? selected.filter((d) => d !== day) : [...selected, day]);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {WEEK_DAYS.map((day) => (
        <CheckboxLabel key={day.value} checked={selected.includes(day.value)} onChange={() => toggle(day.value)}>
          {day.label}
        </CheckboxLabel>
      ))}
    </div>
  );
}

export function SettingsForm({ settings }: { settings: AttendanceSettings }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [workingDays, setWorkingDays] = useState<string[]>(settings.workingDays);
  const [weeklyOffDays, setWeeklyOffDays] = useState<string[]>(settings.weeklyOffDays);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const form = new FormData(e.currentTarget);
    const payload = {
      workStartTime: form.get('workStartTime'),
      workEndTime: form.get('workEndTime'),
      requiredMinutesPerDay: Math.round(Number(form.get('requiredHours')) * 60),
      lateGraceMinutes: Number(form.get('lateGraceMinutes')),
      earlyCheckoutGraceMinutes: Number(form.get('earlyCheckoutGraceMinutes')),
      workingDays,
      weeklyOffDays,
      secondSaturdayOff: form.get('secondSaturdayOff') === 'on',
      breakDurationMinutes: Number(form.get('breakDurationMinutes')),
      halfDayThresholdMinutes: Math.round(Number(form.get('halfDayThresholdHours')) * 60),
      overtimeThresholdMinutes: Number(form.get('overtimeThresholdMinutes')),
      flexibleWorkingEnabled: form.get('flexibleWorkingEnabled') === 'on',
    };
    try {
      const res = await fetch('/api/attendance/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to update settings');
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <ErrorText>{error}</ErrorText>}
      {saved && !error && (
        <div className="rounded-md px-3 py-2 text-sm" style={{ background: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' }}>
          Settings saved.
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Office hours</p>
        <FieldRow>
          <Field label="Office start time" htmlFor="workStartTime">
            <Input id="workStartTime" name="workStartTime" type="time" defaultValue={settings.workStartTime} required />
          </Field>
          <Field label="Office end time" htmlFor="workEndTime">
            <Input id="workEndTime" name="workEndTime" type="time" defaultValue={settings.workEndTime} required />
          </Field>
        </FieldRow>
        <FieldRow className="mt-4">
          <Field label="Total working hours / day" htmlFor="requiredHours">
            <Input id="requiredHours" name="requiredHours" type="number" min={1} step="0.5" defaultValue={settings.requiredMinutesPerDay / 60} required />
          </Field>
          <Field label="Break duration (minutes)" htmlFor="breakDurationMinutes">
            <Input id="breakDurationMinutes" name="breakDurationMinutes" type="number" min={0} defaultValue={settings.breakDurationMinutes} required />
          </Field>
        </FieldRow>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Working days &amp; weekly offs</p>
        <div className="flex flex-col gap-3">
          <Field label="Working days">
            <DayCheckboxes selected={workingDays} onChange={setWorkingDays} />
          </Field>
          <Field label="Weekly off days">
            <DayCheckboxes selected={weeklyOffDays} onChange={setWeeklyOffDays} />
          </Field>
          <CheckboxLabel name="secondSaturdayOff" defaultChecked={settings.secondSaturdayOff}>
            Treat the second Saturday of every month as a company-wide day off
          </CheckboxLabel>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Attendance thresholds</p>
        <FieldRow>
          <Field label="Late arrival grace period (minutes)" htmlFor="lateGraceMinutes">
            <Input id="lateGraceMinutes" name="lateGraceMinutes" type="number" min={0} defaultValue={settings.lateGraceMinutes} required />
          </Field>
          <Field label="Early departure grace period (minutes)" htmlFor="earlyCheckoutGraceMinutes">
            <Input id="earlyCheckoutGraceMinutes" name="earlyCheckoutGraceMinutes" type="number" min={0} defaultValue={settings.earlyCheckoutGraceMinutes} required />
          </Field>
        </FieldRow>
        <FieldRow className="mt-4">
          <Field label="Half-day threshold (hours worked below this = half day)" htmlFor="halfDayThresholdHours">
            <Input id="halfDayThresholdHours" name="halfDayThresholdHours" type="number" min={0} step="0.5" defaultValue={settings.halfDayThresholdMinutes / 60} required />
          </Field>
          <Field label="Overtime threshold (minutes past required hours)" htmlFor="overtimeThresholdMinutes">
            <Input id="overtimeThresholdMinutes" name="overtimeThresholdMinutes" type="number" min={0} defaultValue={settings.overtimeThresholdMinutes} required />
          </Field>
        </FieldRow>
        <div className="mt-3">
          <CheckboxLabel name="flexibleWorkingEnabled" defaultChecked={settings.flexibleWorkingEnabled}>
            Allow flexible working hours company-wide
          </CheckboxLabel>
        </div>
      </div>

      <p className="text-xs text-muted">
        These are company-wide defaults. An employee&rsquo;s own fixed schedule (set on their account) is used
        instead whenever it is configured.
      </p>
      <Button type="submit" disabled={loading} className="self-start">
        {loading ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  );
}
