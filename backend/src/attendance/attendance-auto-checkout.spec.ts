import { ConflictException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

// Asia/Kolkata is UTC+5:30: 09:30 IST = 04:00Z, 19:00 IST (end of work) = 13:30Z, 21:00 IST (the job) = 15:30Z.
const SETTINGS = {
  requiredMinutesPerDay: 480,
  earlyCheckoutGraceMinutes: 0,
  overtimeThresholdMinutes: 0,
  halfDayThresholdMinutes: 240,
  workEndTime: '19:00',
};

function open(over: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    userId: 'u1',
    date: '2026-11-12',
    checkInAt: new Date('2026-11-12T04:00:00Z'), // 09:30 IST
    checkOutAt: null,
    breakStartAt: null,
    totalBreakMinutes: 0,
    scheduledEndTime: '19:00',
    requiredMinutes: 420, // a 7 hour day, so 9.5 hours in the office would be overtime if it were counted
    lateMinutes: 0,
    ...over,
  };
}

function setup(records: unknown[] = []) {
  const prisma = {
    attendanceRecord: {
      findMany: jest.fn().mockResolvedValue(records),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, ...data })),
    },
    attendanceBreak: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null), update: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn().mockResolvedValue({ currentStatus: 'working' }), update: jest.fn() },
  };
  const service = new AttendanceService(prisma as never, { get: async () => SETTINGS } as never, {} as never, { presenceChanged: jest.fn() } as never);
  return { service, prisma };
}

const at = (iso: string) => jest.useFakeTimers().setSystemTime(new Date(iso));
const updated = (prisma: ReturnType<typeof setup>['prisma'], n = 0) => prisma.attendanceRecord.update.mock.calls[n][0].data;

describe('21:00 auto check-out of people who forgot', () => {
  afterEach(() => jest.useRealTimers());

  it('closes them at their end of work (not 21:00), marks them "not checked out", and gives no overtime', async () => {
    at('2026-11-12T15:30:05Z'); // 21:00:05 IST
    const { service, prisma } = setup([open({ totalBreakMinutes: 30 })]);

    expect(await service.autoCloseOpenRecords()).toEqual({ closed: 1, skipped: 0 });

    const where = prisma.attendanceRecord.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ date: '2026-11-12', checkOutAt: null });
    expect(where.checkInAt.lt).toEqual(new Date('2026-11-12T15:30:00Z'));

    const data = updated(prisma);
    expect(data.checkOutAt).toEqual(new Date('2026-11-12T13:30:00Z')); // 19:00 IST, not 21:00
    expect(data.status).toBe('not_checked_out');
    expect(data.workedMinutes).toBe(9.5 * 60 - 30);
    expect(data.overtimeMinutes).toBe(0);
    expect(data.earlyCheckoutMinutes).toBe(0);
    expect(data.breakStartAt).toBeNull();
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { currentStatus: 'offline' } }));
  });

  it('uses each person\'s own end time, and the company end time when they have none', async () => {
    at('2026-11-12T15:30:05Z');
    const { service, prisma } = setup([open({ id: 'early', scheduledEndTime: '17:30' }), open({ id: 'flex', scheduledEndTime: null })]);

    await service.autoCloseOpenRecords();

    expect(updated(prisma, 0).checkOutAt).toEqual(new Date('2026-11-12T12:00:00Z')); // 17:30 IST
    expect(updated(prisma, 1).checkOutAt).toEqual(new Date('2026-11-12T13:30:00Z')); // company 19:00
  });

  it('a break still running at the end of work is counted up to then', async () => {
    at('2026-11-12T15:30:05Z');
    const { service, prisma } = setup([open({ totalBreakMinutes: 60, breakStartAt: new Date('2026-11-12T12:30:00Z') })]); // on a break since 18:00

    await service.autoCloseOpenRecords();

    const data = updated(prisma);
    expect(data.totalBreakMinutes).toBe(120);
    expect(data.workedMinutes).toBe(9.5 * 60 - 120);
    expect(prisma.attendanceBreak.updateMany).toHaveBeenCalledWith({
      where: { attendanceRecordId: 'r1', endAt: null },
      data: { endAt: new Date('2026-11-12T13:30:00Z'), durationMinutes: 60 },
    });
  });

  it('a break that began after the end of work adds nothing and never ends before it started', async () => {
    at('2026-11-12T15:30:05Z');
    const { service, prisma } = setup([open({ totalBreakMinutes: 30, breakStartAt: new Date('2026-11-12T15:00:00Z') })]); // on a break since 20:30

    await service.autoCloseOpenRecords();

    expect(updated(prisma).totalBreakMinutes).toBe(30);
    expect(prisma.attendanceBreak.updateMany).toHaveBeenCalledWith({
      where: { attendanceRecordId: 'r1', endAt: null },
      data: { endAt: new Date('2026-11-12T15:00:00Z'), durationMinutes: 0 },
    });
  });

  it('someone who clocked in after the end of work is closed at that moment with nothing worked', async () => {
    at('2026-11-12T15:30:05Z');
    const { service, prisma } = setup([open({ checkInAt: new Date('2026-11-12T14:00:00Z') })]); // clocked in 19:30

    await service.autoCloseOpenRecords();

    const data = updated(prisma);
    expect(data.checkOutAt).toEqual(new Date('2026-11-12T14:00:00Z'));
    expect(data.workedMinutes).toBe(0);
    expect(data.status).toBe('not_checked_out');
  });

  it('does nothing if it is ever run before 21:00', async () => {
    at('2026-11-12T15:29:00Z');
    const { service, prisma } = setup([open()]);

    expect(await service.autoCloseOpenRecords()).toEqual({ closed: 0, skipped: 0 });
    expect(prisma.attendanceRecord.findMany).not.toHaveBeenCalled();
    expect(prisma.attendanceRecord.update).not.toHaveBeenCalled();
  });

  it('one record failing is skipped and never stops the others or throws', async () => {
    at('2026-11-12T15:30:05Z');
    const { service, prisma } = setup([open({ id: 'bad' }), open({ id: 'good', userId: 'u2' })]);
    prisma.attendanceRecord.update.mockRejectedValueOnce(new Error('database hiccup'));

    expect(await service.autoCloseOpenRecords()).toEqual({ closed: 1, skipped: 1 });
    expect(prisma.attendanceRecord.update).toHaveBeenCalledTimes(2);
  });
});

describe('a person checking out themselves is unchanged', () => {
  afterEach(() => jest.useRealTimers());

  it('gets overtime and a normal status as before', async () => {
    at('2026-11-12T14:30:00Z'); // 20:00 IST, checked out an hour after the end of work
    const { service, prisma } = setup();
    prisma.attendanceRecord.findFirst.mockResolvedValue(open({ requiredMinutes: 480 }));

    const saved = (await service.checkOut('u1')) as unknown as Record<string, unknown>;

    expect(saved.workedMinutes).toBe(10.5 * 60);
    expect(saved.overtimeMinutes).toBe(10.5 * 60 - 480);
    expect(saved.status).toBe('present');
  });
});

describe('checking out, pausing and resuming past midnight', () => {
  afterEach(() => jest.useRealTimers());

  it('check-out at 00:30 finds the open record from the day before and works out the day from it', async () => {
    at('2026-11-12T19:00:00Z'); // 00:30 IST on the 13th
    const { service, prisma } = setup();
    prisma.attendanceRecord.findFirst.mockResolvedValue(open());

    const saved = (await service.checkOut('u1')) as unknown as Record<string, unknown>;

    expect(prisma.attendanceRecord.findFirst.mock.calls[0][0].where.date).toEqual({ gte: '2026-11-12' });
    // Judged against the 19:00 of the day that was worked (the 12th), not 19:00 on the 13th (which would be 1080 minutes "early").
    expect(saved.earlyCheckoutMinutes).toBe(0);
    expect(saved.workedMinutes).toBe(15 * 60);
  });

  it('resuming after midnight finds the break that began before it', async () => {
    at('2026-11-12T19:00:00Z');
    const { service, prisma } = setup();
    prisma.attendanceRecord.findFirst.mockResolvedValue(open({ breakStartAt: new Date('2026-11-12T18:00:00Z'), totalBreakMinutes: 10 }));

    await service.breakEnd('u1');

    expect(prisma.attendanceRecord.update.mock.calls[0][0].data).toMatchObject({ totalBreakMinutes: 70, breakStartAt: null });
  });

  it('a double-clicked Pause is logged once: the second click is refused', async () => {
    at('2026-11-12T10:00:00Z');
    const { service, prisma } = setup();
    prisma.attendanceRecord.findFirst.mockResolvedValue(open());
    prisma.attendanceRecord.updateMany.mockResolvedValue({ count: 0 }); // the other click got there first

    await expect(service.breakStart('u1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.attendanceBreak.create).not.toHaveBeenCalled();
  });

  it('still says "already checked out" when the person has finished for the day', async () => {
    at('2026-11-12T10:00:00Z');
    const { service, prisma } = setup();
    prisma.attendanceRecord.findFirst.mockResolvedValue(null);
    prisma.attendanceRecord.findUnique.mockResolvedValue({ checkOutAt: new Date() });

    await expect(service.checkOut('u1')).rejects.toThrow('Already checked out today');
  });
});
