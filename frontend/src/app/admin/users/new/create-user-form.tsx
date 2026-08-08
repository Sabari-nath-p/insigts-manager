'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import shared from '@/components/shared.module.css';

const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function CreateUserForm() {
  const router = useRouter();
  const [role, setRole] = useState('employee');
  const [workingType, setWorkingType] = useState('fixed');
  const [workingDays, setWorkingDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleDay(day: string) {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      fullName: form.get('fullName'),
      email: form.get('email'),
      password: form.get('password'),
      phone: form.get('phone'),
      role,
      workingType,
      currentSalary: Number(form.get('currentSalary')),
      paidLeaveQuota: Number(form.get('paidLeaveQuota') || 12),
      medicalLeaveQuota: Number(form.get('medicalLeaveQuota') || 12),
    };

    if (workingType === 'fixed') {
      payload.fixedHoursPerDay = Number(form.get('fixedHoursPerDay'));
      payload.fixedStartTime = form.get('fixedStartTime');
      payload.fixedEndTime = form.get('fixedEndTime');
      payload.workingDays = workingDays;
    } else {
      payload.flexibleMonthlyHours = Number(form.get('flexibleMonthlyHours'));
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create account');
      }
      router.push('/admin/users');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={shared.card}>
      {error && <div className={shared.error}>{error}</div>}

      <div className={shared.fieldRow}>
        <div className={shared.field}>
          <label className={shared.label} htmlFor="fullName">
            Full name
          </label>
          <input id="fullName" name="fullName" className={shared.input} required />
        </div>
        <div className={shared.field}>
          <label className={shared.label} htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" className={shared.input} required />
        </div>
      </div>

      <div className={shared.fieldRow}>
        <div className={shared.field}>
          <label className={shared.label} htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" className={shared.input} required />
        </div>
        <div className={shared.field}>
          <label className={shared.label} htmlFor="password">
            Temporary password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={6}
            className={shared.input}
            required
          />
        </div>
      </div>

      <div className={shared.fieldRow}>
        <div className={shared.field}>
          <label className={shared.label} htmlFor="role">
            Role
          </label>
          <select
            id="role"
            className={shared.select}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="employee">Employee</option>
            <option value="super_admin">Super admin</option>
          </select>
        </div>
        <div className={shared.field}>
          <label className={shared.label} htmlFor="currentSalary">
            Current salary
          </label>
          <input
            id="currentSalary"
            name="currentSalary"
            type="number"
            min={0}
            step="0.01"
            className={shared.input}
            required
          />
        </div>
      </div>

      <div className={shared.field}>
        <label className={shared.label} htmlFor="workingType">
          Working type
        </label>
        <select
          id="workingType"
          className={shared.select}
          value={workingType}
          onChange={(e) => setWorkingType(e.target.value)}
        >
          <option value="fixed">Fixed</option>
          <option value="flexible">Flexible</option>
        </select>
      </div>

      {workingType === 'fixed' ? (
        <>
          <div className={shared.fieldRow}>
            <div className={shared.field}>
              <label className={shared.label} htmlFor="fixedHoursPerDay">
                Fixed hours / day
              </label>
              <input
                id="fixedHoursPerDay"
                name="fixedHoursPerDay"
                type="number"
                min={0}
                step="0.5"
                className={shared.input}
                defaultValue={8}
                required
              />
            </div>
            <div className={shared.fieldRow} style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className={shared.field}>
                <label className={shared.label} htmlFor="fixedStartTime">
                  Start time
                </label>
                <input
                  id="fixedStartTime"
                  name="fixedStartTime"
                  type="time"
                  className={shared.input}
                  defaultValue="09:00"
                  required
                />
              </div>
              <div className={shared.field}>
                <label className={shared.label} htmlFor="fixedEndTime">
                  End time
                </label>
                <input
                  id="fixedEndTime"
                  name="fixedEndTime"
                  type="time"
                  className={shared.input}
                  defaultValue="17:00"
                  required
                />
              </div>
            </div>
          </div>

          <div className={shared.field}>
            <label className={shared.label}>Working days</label>
            <div className={shared.checkboxRow}>
              {WEEK_DAYS.map((day) => (
                <label key={day} className={shared.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={workingDays.includes(day)}
                    onChange={() => toggleDay(day)}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className={shared.field}>
          <label className={shared.label} htmlFor="flexibleMonthlyHours">
            Total work hours / month
          </label>
          <input
            id="flexibleMonthlyHours"
            name="flexibleMonthlyHours"
            type="number"
            min={0}
            step="1"
            className={shared.input}
            defaultValue={160}
            required
          />
        </div>
      )}

      <div className={shared.fieldRow}>
        <div className={shared.field}>
          <label className={shared.label} htmlFor="paidLeaveQuota">
            Paid leave / year
          </label>
          <input
            id="paidLeaveQuota"
            name="paidLeaveQuota"
            type="number"
            min={0}
            className={shared.input}
            defaultValue={12}
          />
        </div>
        <div className={shared.field}>
          <label className={shared.label} htmlFor="medicalLeaveQuota">
            Medical leave / year
          </label>
          <input
            id="medicalLeaveQuota"
            name="medicalLeaveQuota"
            type="number"
            min={0}
            className={shared.input}
            defaultValue={12}
          />
        </div>
      </div>

      <button type="submit" className={shared.button} disabled={loading}>
        {loading ? 'Creating…' : 'Create account'}
      </button>
    </form>
  );
}
