import { positionBetween, todayIso } from './format';
import type { BoardData, BoardFilters, PmTask } from './types';

export const FILTER_KEYS = ['assignee', 'priority', 'label', 'due', 'q'] as const;

export function parseFilters(get: (k: string) => string | null): BoardFilters {
  const f: BoardFilters = {};
  for (const k of FILTER_KEYS) {
    const v = get(k);
    if (v) f[k] = v;
  }
  return f;
}

export function hasFilters(f: BoardFilters): boolean {
  return FILTER_KEYS.some((k) => !!f[k]);
}

function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/** Applies the filter bar to the tasks, in memory. Mirrors the server's board query filters. */
export function applyFilters(tasks: PmTask[], f: BoardFilters, meId: string, doneColumnIds: Set<string>): PmTask[] {
  const today = todayIso();
  const text = f.q?.trim().toLowerCase();
  return tasks.filter((t) => {
    if (f.assignee === 'me' && t.assigneeId !== meId) return false;
    if (f.assignee === 'none' && t.assigneeId) return false;
    if (f.assignee && f.assignee !== 'me' && f.assignee !== 'none' && t.assigneeId !== f.assignee) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.label && !t.labelIds.includes(f.label)) return false;
    if (f.due === 'overdue' && !(t.dueDate && t.dueDate < today && !doneColumnIds.has(t.columnId))) return false;
    if (f.due === 'week' && !(t.dueDate && t.dueDate >= today && t.dueDate <= addDays(today, 7))) return false;
    if (text && !t.title.toLowerCase().includes(text) && !t.ref.toLowerCase().includes(text)) return false;
    return true;
  });
}

export function tasksByColumn(tasks: PmTask[], columnIds: string[]): Map<string, PmTask[]> {
  const map = new Map<string, PmTask[]>(columnIds.map((id) => [id, []]));
  for (const t of tasks) map.get(t.columnId)?.push(t);
  for (const list of map.values()) list.sort((a, b) => a.position - b.position);
  return map;
}

/**
 * Optimistic version of the server's move: removes the task from wherever it is and inserts it
 * after `afterTaskId` in `columnId` (or at the top when null), using the same fractional maths.
 */
export function moveInBoard(data: BoardData, taskId: string, columnId: string, afterTaskId: string | null): BoardData {
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) return data;
  const column = data.columns.find((c) => c.id === columnId);
  const siblings = data.tasks.filter((t) => t.columnId === columnId && t.id !== taskId).sort((a, b) => a.position - b.position);
  const idx = afterTaskId ? siblings.findIndex((s) => s.id === afterTaskId) : -1;
  const position = positionBetween(siblings[idx]?.position ?? null, siblings[idx + 1]?.position ?? null);
  const wasDone = data.columns.find((c) => c.id === task.columnId)?.type === 'done';
  const nowDone = column?.type === 'done';
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      t.id === taskId
        ? { ...t, columnId, position, completedAt: nowDone && !wasDone ? new Date().toISOString() : !nowDone && wasDone ? null : t.completedAt }
        : t,
    ),
  };
}
