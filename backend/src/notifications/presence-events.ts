import { PresenceStatus } from '@prisma/client';

export type PresenceEvent = 'started' | 'paused' | 'resumed';

/**
 * Which status transitions are announced to the team. Everything else (meeting, leave, check-out,
 * repeated saves of the same status) stays silent. Add a case here to announce more.
 */
export function presenceEvent(prev: PresenceStatus | null | undefined, next: PresenceStatus): PresenceEvent | null {
  if (prev === next) return null;
  if (next === 'working') {
    if (prev === 'on_break') return 'resumed';
    if (!prev || prev === 'offline' || prev === 'on_leave') return 'started';
    return null; // e.g. back from a meeting
  }
  if (next === 'on_break' && prev !== 'offline' && prev !== 'on_leave') return 'paused';
  return null;
}

export const PRESENCE_TEXT: Record<PresenceEvent, (name: string) => string> = {
  started: (n) => `${n} started work`,
  paused: (n) => `${n} paused for a break`,
  resumed: (n) => `${n} is back from break`,
};
