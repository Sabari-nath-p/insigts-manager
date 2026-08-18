import { requireSuperAdmin } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { Settings as SettingsIcon } from 'lucide-react';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Metric, MetricStrip } from '@/components/ui/property-row';
import { SettingsForm, AttendanceSettings } from './settings-form';
import { HolidayCalendar } from './holiday-calendar';
import { HolidayToolbar } from './holiday-toolbar';
import { Holiday } from './holiday-types';

interface EmployeeSummary {
  id: string;
  department: string | null;
}

const WEEKDAY_NAMES: Record<string, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
};

function monthLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export default async function AttendanceSettingsPage() {
  const { token, user } = await requireSuperAdmin();
  const today = new Date();
  const from = `${today.getFullYear() - 1}-01-01`;
  const to = `${today.getFullYear() + 1}-12-31`;

  const [settings, holidays, employees] = await Promise.all([
    apiFetch<AttendanceSettings>('/attendance/settings', { token }),
    apiFetch<Holiday[]>(`/attendance/holidays?from=${from}&to=${to}`, { token }),
    apiFetch<EmployeeSummary[]>('/users', { token }),
  ]);

  const departments = Array.from(new Set(employees.map((e) => e.department).filter((d): d is string => !!d)));
  const activeHolidays = holidays.filter((h) => h.isActive);
  const calendarPeriod =
    activeHolidays.length > 0
      ? `${monthLabel(activeHolidays[0].date)} – ${monthLabel(activeHolidays[activeHolidays.length - 1].date)}`
      : '—';

  return (
    <AppShell user={user} title="Settings">
      <PageHeader
        title="Settings"
        icon={SettingsIcon}
        tone="gray"
        subtitle="Company-wide working hours, weekly offs and the official holiday calendar. Attendance is calculated automatically from these settings."
      />

      <MetricStrip className="mb-8">
        <Metric label="Working days" value={`${settings.workingDays.length} days/week`} />
        <Metric label="Daily hours" value={`${settings.requiredMinutesPerDay / 60} hrs`} />
        <Metric
          label="Weekly off"
          value={`${settings.weeklyOffDays.map((d) => WEEKDAY_NAMES[d] ?? d).join(', ') || '—'}${settings.secondSaturdayOff ? ' + 2nd Sat' : ''}`}
        />
        <Metric label="Holidays" value={activeHolidays.length} />
        <Metric label="Calendar period" value={calendarPeriod} />
      </MetricStrip>

      <SectionTitle>Working hours</SectionTitle>
      <SettingsForm settings={settings} />

      <SectionTitle>Holiday calendar</SectionTitle>
      <HolidayToolbar departments={departments} />
      <HolidayCalendar holidays={holidays} departments={departments} initialYear={today.getFullYear()} initialMonth={today.getMonth()} />
    </AppShell>
  );
}
