'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FieldRow, Input, Select, CheckboxLabel, ErrorText } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export interface EditableUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  designation: string | null;
  department: string | null;
  joiningDate: string | null;
  managerId: string | null;
  workingType: string;
  fixedHoursPerDay: number | null;
  fixedStartTime: string | null;
  fixedEndTime: string | null;
  workingDays: string[] | null;
  flexibleMonthlyHours: number | null;
  currentSalary: string;
  paidLeaveQuota: number;
  medicalLeaveQuota: number;
  isActive: boolean;
}

export function CreateUserForm({
  user,
  managers,
  onSuccess,
}: {
  user?: EditableUser | null; // omitted/null = creating a new account
  managers: { id: string; fullName: string; role: string }[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!user;
  const [role, setRole] = useState(user?.role ?? 'employee');
  const [workingType, setWorkingType] = useState(user?.workingType ?? 'fixed');
  const [workingDays, setWorkingDays] = useState<string[]>(
    user?.workingDays ?? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleDay(day: string) {
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      fullName: form.get('fullName'),
      email: form.get('email'),
      phone: form.get('phone'),
      role,
      designation: form.get('designation') || undefined,
      department: form.get('department') || undefined,
      joiningDate: form.get('joiningDate') || undefined,
      managerId: form.get('managerId') || undefined,
      workingType,
      currentSalary: Number(form.get('currentSalary')),
      paidLeaveQuota: Number(form.get('paidLeaveQuota') || 12),
      medicalLeaveQuota: Number(form.get('medicalLeaveQuota') || 12),
    };
    if (!isEdit) {
      payload.password = form.get('password');
    } else {
      payload.isActive = form.get('isActive') === 'on';
    }

    if (workingType === 'fixed') {
      payload.fixedHoursPerDay = Number(form.get('fixedHoursPerDay'));
      payload.fixedStartTime = form.get('fixedStartTime');
      payload.fixedEndTime = form.get('fixedEndTime');
      payload.workingDays = workingDays;
    } else {
      payload.flexibleMonthlyHours = Number(form.get('flexibleMonthlyHours'));
    }

    try {
      const res = await fetch(isEdit ? `/api/users/${user!.id}` : '/api/users', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `Failed to ${isEdit ? 'save' : 'create'} account`);
      }
      router.refresh();
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/admin/users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <ErrorText>{error}</ErrorText>}

      <FieldRow>
        <Field label="Full name" htmlFor="fullName">
          <Input id="fullName" name="fullName" defaultValue={user?.fullName} required />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={user?.phone} required />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={user?.email} required />
        </Field>
        {isEdit ? (
          <Field label="Active" htmlFor="isActive" hint="Uncheck to deactivate — disables login, keeps history.">
            <div className="flex h-9 items-center">
              <CheckboxLabel name="isActive" defaultChecked={user?.isActive ?? true}>
                Account is active
              </CheckboxLabel>
            </div>
          </Field>
        ) : (
          <Field label="Temporary password" htmlFor="password">
            <Input id="password" name="password" type="password" minLength={6} required />
          </Field>
        )}
      </FieldRow>

      <FieldRow>
        <Field label="Role" htmlFor="role">
          <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="super_admin">Super admin</option>
          </Select>
        </Field>
        <Field label="Current salary" htmlFor="currentSalary">
          <Input
            id="currentSalary"
            name="currentSalary"
            type="number"
            min={0}
            step="0.01"
            defaultValue={user?.currentSalary}
            required
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Designation" htmlFor="designation">
          <Input id="designation" name="designation" placeholder="e.g. Software Engineer" defaultValue={user?.designation ?? ''} />
        </Field>
        <Field label="Department" htmlFor="department">
          <Input id="department" name="department" placeholder="e.g. Engineering" defaultValue={user?.department ?? ''} />
        </Field>
      </FieldRow>

      <Field label="Reports to" htmlFor="managerId">
        <Select id="managerId" name="managerId" defaultValue={user?.managerId ?? ''}>
          <option value="">No manager assigned</option>
          {managers
            .filter((m) => m.id !== user?.id)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName} ({m.role === 'super_admin' ? 'Super admin' : 'Manager'})
              </option>
            ))}
        </Select>
      </Field>

      <Field label="Joining date" htmlFor="joiningDate">
        <Input id="joiningDate" name="joiningDate" type="date" defaultValue={user?.joiningDate ?? ''} />
      </Field>

      <Field label="Working type" htmlFor="workingType">
        <Select id="workingType" value={workingType} onChange={(e) => setWorkingType(e.target.value)}>
          <option value="fixed">Fixed</option>
          <option value="flexible">Flexible</option>
        </Select>
      </Field>

      {workingType === 'fixed' ? (
        <>
          <FieldRow>
            <Field label="Fixed hours / day" htmlFor="fixedHoursPerDay">
              <Input
                id="fixedHoursPerDay"
                name="fixedHoursPerDay"
                type="number"
                min={0}
                step="0.5"
                defaultValue={user?.fixedHoursPerDay ?? 8}
                required
              />
            </Field>
            <FieldRow className="grid-cols-2">
              <Field label="Start time" htmlFor="fixedStartTime">
                <Input
                  id="fixedStartTime"
                  name="fixedStartTime"
                  type="time"
                  defaultValue={user?.fixedStartTime ?? '09:00'}
                  required
                />
              </Field>
              <Field label="End time" htmlFor="fixedEndTime">
                <Input
                  id="fixedEndTime"
                  name="fixedEndTime"
                  type="time"
                  defaultValue={user?.fixedEndTime ?? '17:00'}
                  required
                />
              </Field>
            </FieldRow>
          </FieldRow>

          <Field label="Working days">
            <div className="flex flex-wrap gap-3">
              {WEEK_DAYS.map((day) => (
                <CheckboxLabel key={day} checked={workingDays.includes(day)} onChange={() => toggleDay(day)}>
                  {day}
                </CheckboxLabel>
              ))}
            </div>
          </Field>
        </>
      ) : (
        <Field label="Total work hours / month" htmlFor="flexibleMonthlyHours">
          <Input
            id="flexibleMonthlyHours"
            name="flexibleMonthlyHours"
            type="number"
            min={0}
            step="1"
            defaultValue={user?.flexibleMonthlyHours ?? 160}
            required
          />
        </Field>
      )}

      <FieldRow>
        <Field label="Paid leave / year" htmlFor="paidLeaveQuota">
          <Input id="paidLeaveQuota" name="paidLeaveQuota" type="number" min={0} defaultValue={user?.paidLeaveQuota ?? 12} />
        </Field>
        <Field label="Medical leave / year" htmlFor="medicalLeaveQuota">
          <Input id="medicalLeaveQuota" name="medicalLeaveQuota" type="number" min={0} defaultValue={user?.medicalLeaveQuota ?? 12} />
        </Field>
      </FieldRow>

      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create account'}
      </Button>
    </form>
  );
}
