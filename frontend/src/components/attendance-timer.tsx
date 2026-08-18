'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { ErrorText } from '@/components/ui/field';
import { Metric, MetricStrip } from '@/components/ui/property-row';
import { statusBadgeKey, statusLabel, formatMinutes, formatScheduledTime, formatTime } from '@/lib/attendance-format';

export interface TodayRecord {
  checkInAt: string | null;
  checkOutAt: string | null;
  breakStartAt: string | null;
  totalBreakMinutes: number;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  requiredMinutes?: number | null;
  lateMinutes?: number;
  earlyCheckoutMinutes?: number;
  overtimeMinutes?: number;
  status?: string;
}

function computeElapsedMs(today: TodayRecord | null, now: Date): number {
  if (!today?.checkInAt) return 0;
  const checkIn = new Date(today.checkInAt).getTime();
  const totalBreakMs = (today.totalBreakMinutes ?? 0) * 60000;
  const endPoint = today.checkOutAt
    ? new Date(today.checkOutAt).getTime()
    : today.breakStartAt
      ? new Date(today.breakStartAt).getTime()
      : now.getTime();
  return Math.max(endPoint - checkIn - totalBreakMs, 0);
}

function computeCurrentBreakMs(today: TodayRecord | null, now: Date): number {
  if (!today?.breakStartAt) return 0;
  return Math.max(now.getTime() - new Date(today.breakStartAt).getTime(), 0);
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

export function AttendanceTimer({ today }: { today: TodayRecord | null }) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCheckedIn = Boolean(today?.checkInAt);
  const hasCheckedOut = Boolean(today?.checkOutAt);
  const onBreak = Boolean(today?.breakStartAt);
  const isTicking = hasCheckedIn && !hasCheckedOut && !onBreak;

  useEffect(() => {
    if (!isTicking && !onBreak) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [isTicking, onBreak]);

  async function trigger(path: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(path, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Request failed');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const elapsedMs = computeElapsedMs(today, now);
  const workedMinutesSoFar = Math.floor(elapsedMs / 60000);
  const currentBreakMinutes = Math.floor(computeCurrentBreakMs(today, now) / 60000);
  const breakMinutesDisplay = (today?.totalBreakMinutes ?? 0) + (onBreak ? currentBreakMinutes : 0);
  const requiredMinutes = today?.requiredMinutes ?? null;
  const liveOvertimeMinutes = requiredMinutes != null ? Math.max(workedMinutesSoFar - requiredMinutes, 0) : null;

  return (
    <div>
      {error && <ErrorText>{error}</ErrorText>}

      <div className="flex flex-col items-center gap-2 py-6">
        {today?.status && (
          <Pill tone={statusBadgeKey(today.status)}>{onBreak ? 'On break' : statusLabel(today.status)}</Pill>
        )}
        <div className={cn('font-mono text-5xl font-semibold tabular-nums text-text', onBreak && 'text-muted')}>
          {formatElapsed(elapsedMs)}
        </div>
        <p className="text-center text-sm text-muted">
          {!hasCheckedIn && 'You have not checked in today.'}
          {hasCheckedIn && onBreak && `On a break since ${formatTime(today!.breakStartAt)} — timer paused.`}
          {hasCheckedIn && !hasCheckedOut && !onBreak && `Checked in at ${formatTime(today!.checkInAt)}.`}
          {hasCheckedOut &&
            `Checked in ${formatTime(today!.checkInAt)} · checked out ${formatTime(today!.checkOutAt)}. See you tomorrow!`}
        </p>
      </div>

      {hasCheckedIn && (
        <MetricStrip className="mb-6">
          <Metric label="Clock in" value={formatTime(today!.checkInAt)} />
          <Metric label="Scheduled start" value={formatScheduledTime(today?.scheduledStartTime)} />
          <Metric label="Late" value={formatMinutes(today?.lateMinutes ?? 0)} />
          <Metric label="Break" value={formatMinutes(breakMinutesDisplay)} />
          {hasCheckedOut ? (
            <>
              <Metric label="Clock out" value={formatTime(today!.checkOutAt)} />
              <Metric label="Scheduled end" value={formatScheduledTime(today?.scheduledEndTime)} />
              <Metric label="Early checkout" value={formatMinutes(today?.earlyCheckoutMinutes ?? 0)} />
            </>
          ) : (
            <Metric label="Scheduled end" value={formatScheduledTime(today?.scheduledEndTime)} />
          )}
          <Metric label="Worked" value={formatMinutes(workedMinutesSoFar)} />
          <Metric label="Overtime" value={formatMinutes(today?.overtimeMinutes ?? liveOvertimeMinutes ?? 0)} />
        </MetricStrip>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Button disabled={loading || hasCheckedIn} onClick={() => trigger('/api/attendance/check-in')}>
          Check in
        </Button>
        {!onBreak ? (
          <Button
            variant="secondary"
            disabled={loading || !hasCheckedIn || hasCheckedOut}
            onClick={() => trigger('/api/attendance/break-start')}
          >
            Take a break
          </Button>
        ) : (
          <Button disabled={loading} onClick={() => trigger('/api/attendance/break-end')}>
            Resume
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={loading || !hasCheckedIn || hasCheckedOut || onBreak}
          onClick={() => trigger('/api/attendance/check-out')}
        >
          Check out
        </Button>
      </div>
    </div>
  );
}
