'use client';

import { useEffect, useState } from 'react';
import { formatMinutes } from '@/lib/attendance-format';

/**
 * Server-rendered pages only know worked-so-far as of the last request. For a row that's
 * still checked in, this ticks locally against the real checkInAt instant instead of sitting
 * frozen at whatever value the page loaded with.
 */
export function LiveWorkedMinutes({
  checkInAt,
  breakMinutes,
  isLive,
  initialMinutes,
}: {
  checkInAt: string | null;
  breakMinutes: number;
  isLive: boolean;
  initialMinutes: number;
}) {
  const [minutes, setMinutes] = useState(initialMinutes);

  useEffect(() => {
    if (!isLive || !checkInAt) return;
    const checkInMs = new Date(checkInAt).getTime();
    const tick = () => {
      const rawMinutes = Math.round((Date.now() - checkInMs) / 60000);
      setMinutes(Math.max(rawMinutes - breakMinutes, 0));
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [isLive, checkInAt, breakMinutes]);

  return <>{formatMinutes(minutes)}</>;
}
