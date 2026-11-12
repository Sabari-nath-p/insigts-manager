import { AttendanceStatus } from '@prisma/client';
import { buildAttendanceDayView } from './attendance-day-view';

const record = (over: Record<string, unknown>) =>
  ({
    id: 'r1',
    userId: 'u1',
    date: '2026-11-12',
    checkInAt: new Date('2026-11-12T04:00:00Z'), // 09:30 IST
    checkOutAt: null,
    breakStartAt: null,
    totalBreakMinutes: 0,
    workedMinutes: null,
    lateMinutes: 0,
    earlyCheckoutMinutes: 0,
    overtimeMinutes: 0,
    scheduledStartTime: null,
    scheduledEndTime: null,
    status: AttendanceStatus.currently_working,
    ...over,
  }) as never;

const view = (date: string, rec: unknown) =>
  buildAttendanceDayView({ userId: 'u1', date, today: '2026-11-12', record: rec as never, isHoliday: false, isOnLeave: false, isWorkingDay: true });

describe('attendance day view: worked time of a record that was never checked out', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-11-12T10:00:00Z')));
  afterEach(() => jest.useRealTimers());

  it('a past day with no check-out shows 0, not "now minus check-in" (which grew past 160 hours)', () => {
    const past = record({ date: '2026-11-05', checkInAt: new Date('2026-11-05T04:00:00Z') });
    const v = view('2026-11-05', past)!;
    expect(v.status).toBe(AttendanceStatus.not_checked_out);
    expect(v.workedMinutes).toBe(0);
  });

  it('the day in progress counts up to now, minus breaks already taken', () => {
    const v = view('2026-11-12', record({ totalBreakMinutes: 30 }))!;
    expect(v.workedMinutes).toBe(6 * 60 - 30);
  });

  it('during a break the clock stops at the moment the break began', () => {
    const v = view('2026-11-12', record({ breakStartAt: new Date('2026-11-12T08:00:00Z') }))!; // on a break since 4 hours in
    expect(v.workedMinutes).toBe(4 * 60);
  });

  it('a finished day shows the saved worked time', () => {
    const done = record({ checkOutAt: new Date('2026-11-12T09:00:00Z'), workedMinutes: 270, status: AttendanceStatus.present });
    expect(view('2026-11-12', done)!.workedMinutes).toBe(270);
  });
});
