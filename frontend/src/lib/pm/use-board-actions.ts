'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/projects/_components/providers';
import { pm } from './client';
import { moveInBoard } from './board-logic';
import type { BoardData, PmLabel, PmTask, Priority } from './types';

export interface TaskPatch {
  title?: string;
  description?: string;
  priority?: Priority;
  /** The full set of people on the task; replaces the current set and must not be empty. */
  assigneeIds?: string[];
  dueDate?: string | null;
  labelIds?: string[];
}

/**
 * Board mutations. Every one updates the cached board first (so the UI never waits), then
 * talks to the server, and rolls back with a toast if the server refuses.
 */
export function useBoardActions(projectKey: string, boardKey: readonly unknown[], memberNames: Map<string, string>) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const read = useCallback(() => qc.getQueryData<BoardData>(boardKey), [qc, boardKey]);
  const write = useCallback((fn: (d: BoardData) => BoardData) => qc.setQueryData<BoardData>(boardKey, (d) => (d ? fn(d) : d)), [qc, boardKey]);

  const rollback = useCallback(
    (snapshot: BoardData | undefined, message: string) => {
      if (snapshot) qc.setQueryData(boardKey, snapshot);
      toast(message);
    },
    [qc, boardKey, toast],
  );

  const afterWrite = useCallback(
    (ref?: string) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      if (ref) qc.invalidateQueries({ queryKey: ['task', ref] });
    },
    [qc],
  );

  const createTask = useCallback(
    async (columnId: string, title: string, extra: { assigneeIds?: string[] } = {}) => {
      const snapshot = read();
      const column = snapshot?.columns.find((c) => c.id === columnId);
      if (!snapshot || !column) return;
      const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
      const last = snapshot.tasks.filter((t) => t.columnId === columnId).reduce((m, t) => Math.max(m, t.position), 0);
      const now = new Date().toISOString();
      const temp: PmTask = {
        id: tempId,
        ref: `${projectKey}-…`,
        projectId: snapshot.project.id,
        projectKey,
        columnId,
        number: 0,
        title,
        description: null,
        priority: 'medium',
        assignees: (extra.assigneeIds ?? []).map((id) => ({ id, name: memberNames.get(id) ?? '' })),
        dueDate: null,
        position: last + 1000,
        createdBy: '',
        completedAt: column.type === 'done' ? now : null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
        labelIds: [],
        updateCount: 0,
      };
      write((d) => ({ ...d, tasks: [...d.tasks, temp] }));
      try {
        const real = await pm<PmTask>(`/projects/${projectKey}/tasks`, { method: 'POST', body: { title, columnId, assigneeIds: extra.assigneeIds } });
        write((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === tempId ? real : t)) }));
        afterWrite();
      } catch (e) {
        rollback(snapshot, (e as Error).message);
      }
    },
    [read, write, rollback, afterWrite, projectKey, memberNames],
  );

  const moveTask = useCallback(
    async (task: PmTask, columnId: string, afterTaskId: string | null) => {
      if (task.id.startsWith('tmp-')) return;
      const snapshot = read();
      const fromColumn = snapshot?.columns.find((c) => c.id === task.columnId);
      const toColumn = snapshot?.columns.find((c) => c.id === columnId);
      write((d) => moveInBoard(d, task.id, columnId, afterTaskId));
      try {
        await pm(`/tasks/${task.id}/move`, { method: 'POST', body: { columnId, afterTaskId: afterTaskId ?? undefined } });
        afterWrite(task.ref);
        if (fromColumn && toColumn && fromColumn.id !== toColumn.id) {
          toast(`Moved ${task.ref} to ${toColumn.name}`, {
            undo: () => {
              const prevSiblings = snapshot?.tasks.filter((t) => t.columnId === fromColumn.id && t.id !== task.id && t.position < task.position).sort((a, b) => b.position - a.position);
              moveTask({ ...task, columnId }, fromColumn.id, prevSiblings?.[0]?.id ?? null);
            },
          });
        }
      } catch (e) {
        rollback(snapshot, (e as Error).message);
      }
    },
    [read, write, rollback, afterWrite, toast],
  );

  const patchTask = useCallback(
    async (task: PmTask, patch: TaskPatch) => {
      const snapshot = read();
      const { assigneeIds, ...fields } = patch;
      write((d) => ({
        ...d,
        tasks: d.tasks.map((t) =>
          t.id === task.id
            ? {
                ...t,
                ...fields,
                assignees: assigneeIds ? assigneeIds.map((id) => ({ id, name: memberNames.get(id) ?? '' })) : t.assignees,
              }
            : t,
        ),
      }));
      try {
        await pm(`/tasks/${task.id}`, { method: 'PATCH', body: patch });
        afterWrite(task.ref);
      } catch (e) {
        rollback(snapshot, (e as Error).message);
      }
    },
    [read, write, rollback, afterWrite, memberNames],
  );

  const archiveTask = useCallback(
    async (task: PmTask) => {
      const snapshot = read();
      write((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== task.id) }));
      try {
        await pm(`/tasks/${task.id}/archive`, { method: 'POST' });
        afterWrite();
        toast(`Archived ${task.ref}`, {
          undo: async () => {
            await pm(`/tasks/${task.id}/restore`, { method: 'POST' });
            qc.invalidateQueries({ queryKey: boardKey });
            afterWrite();
          },
        });
      } catch (e) {
        rollback(snapshot, (e as Error).message);
      }
    },
    [read, write, rollback, afterWrite, toast, qc, boardKey],
  );

  const deleteTask = useCallback(
    async (task: PmTask) => {
      const snapshot = read();
      write((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== task.id) }));
      try {
        await pm(`/tasks/${task.id}`, { method: 'DELETE' });
        afterWrite();
        toast(`Deleted ${task.ref}`);
      } catch (e) {
        rollback(snapshot, (e as Error).message);
      }
    },
    [read, write, rollback, afterWrite, toast],
  );

  /** Removes a label from the project and from every task that has it. Instant, rolled back if refused. */
  const deleteLabel = useCallback(
    async (label: PmLabel) => {
      const snapshot = read();
      write((d) => ({
        ...d,
        labels: d.labels.filter((l) => l.id !== label.id),
        tasks: d.tasks.map((t) => ({ ...t, labelIds: t.labelIds.filter((id) => id !== label.id) })),
      }));
      try {
        await pm(`/labels/${label.id}`, { method: 'DELETE' });
        toast(`Deleted label ${label.name}`);
      } catch (e) {
        rollback(snapshot, (e as Error).message);
      }
    },
    [read, write, rollback, toast],
  );

  /** Changes the same fields on many tasks at once. Shown instantly; any task the server refuses goes back to how it was. */
  const patchMany = useCallback(
    async (tasks: PmTask[], patchFor: (t: PmTask) => TaskPatch) => {
      const snapshot = read();
      const list = tasks.filter((t) => !t.id.startsWith('tmp-'));
      if (!snapshot || list.length === 0) return;
      const patches = new Map(list.map((t) => [t.id, patchFor(t)]));
      write((d) => ({
        ...d,
        tasks: d.tasks.map((t) => {
          const patch = patches.get(t.id);
          if (!patch) return t;
          const { assigneeIds, ...fields } = patch;
          return { ...t, ...fields, assignees: assigneeIds ? assigneeIds.map((id) => ({ id, name: memberNames.get(id) ?? '' })) : t.assignees };
        }),
      }));
      const failed: PmTask[] = [];
      let firstError = '';
      for (let i = 0; i < list.length; i += 4) {
        await Promise.all(
          list.slice(i, i + 4).map(async (t) => {
            try {
              await pm(`/tasks/${t.id}`, { method: 'PATCH', body: patches.get(t.id) });
            } catch (e) {
              failed.push(t);
              firstError ||= (e as Error).message;
            }
          }),
        );
      }
      if (failed.length) {
        const before = new Map(failed.map((t) => [t.id, snapshot.tasks.find((x) => x.id === t.id)]));
        write((d) => ({ ...d, tasks: d.tasks.map((t) => before.get(t.id) ?? t) }));
        toast(`${failed.length} of ${list.length} tasks could not be updated: ${firstError}`);
      }
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['task'] });
    },
    [read, write, toast, qc, memberNames],
  );

  /** Moves many tasks to one column. One at a time, so the server places each card cleanly. */
  const moveMany = useCallback(
    async (tasks: PmTask[], columnId: string) => {
      const snapshot = read();
      const toColumn = snapshot?.columns.find((c) => c.id === columnId);
      const list = tasks.filter((t) => !t.id.startsWith('tmp-') && t.columnId !== columnId);
      if (!snapshot || !toColumn || list.length === 0) return;
      write((d) => list.reduce((acc, t) => moveInBoard(acc, t.id, columnId, null), d));
      const failed: PmTask[] = [];
      let firstError = '';
      for (const t of list) {
        try {
          await pm(`/tasks/${t.id}/move`, { method: 'POST', body: { columnId } });
        } catch (e) {
          failed.push(t);
          firstError ||= (e as Error).message;
        }
      }
      if (failed.length) {
        const before = new Map(failed.map((t) => [t.id, snapshot.tasks.find((x) => x.id === t.id)]));
        write((d) => ({ ...d, tasks: d.tasks.map((t) => before.get(t.id) ?? t) }));
        toast(`${failed.length} of ${list.length} tasks could not be moved: ${firstError}`);
      } else {
        toast(`Moved ${list.length} ${list.length === 1 ? 'task' : 'tasks'} to ${toColumn.name}`);
      }
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['task'] });
    },
    [read, write, toast, qc],
  );

  const refetch = useCallback(() => qc.invalidateQueries({ queryKey: boardKey }), [qc, boardKey]);

  return { createTask, moveTask, moveMany, patchTask, patchMany, archiveTask, deleteTask, deleteLabel, refetch };
}
