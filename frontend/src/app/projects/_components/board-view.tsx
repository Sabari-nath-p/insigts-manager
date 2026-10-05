'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { pm } from '@/lib/pm/client';
import { FILTER_KEYS, applyFilters, hasFilters, parseFilters, tasksByColumn } from '@/lib/pm/board-logic';
import { useBoardActions } from '@/lib/pm/use-board-actions';
import type { BoardData, PmColumn, PmLabel, PmMe, PmTask } from '@/lib/pm/types';
import { CardBody, SortableTaskCard } from './task-card';
import { TaskDrawer } from './task-drawer';
import { ListView } from './list-view';
import { BoardHeader } from './board-header';
import { ColumnMenu } from './column-menu';

const OLD_DONE_PARAM = 'olderDone';

export function BoardView({ projectKey, me, initial }: { projectKey: string; me: PmMe; initial: BoardData }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const showOlder = params.get(OLD_DONE_PARAM) === '1';
  const view = params.get('view') === 'list' ? 'list' : 'board';
  const taskRef = params.get('task');
  const filters = useMemo(() => parseFilters((k) => params.get(k)), [params]);

  // The board key excludes filters on purpose: filtering is done in memory so it is instant.
  const boardKey = useMemo(() => ['board', projectKey, showOlder] as const, [projectKey, showOlder]);
  const { data = initial } = useQuery({
    queryKey: boardKey,
    queryFn: () => pm<BoardData>(`/projects/${projectKey}/board${showOlder ? '?olderDone=1' : ''}`),
    initialData: showOlder ? undefined : initial,
    refetchInterval: () => (document.hidden ? false : 10_000),
  });

  const memberNames = useMemo(() => new Map(data.members.map((m) => [m.id, m.fullName])), [data.members]);
  const labelMap = useMemo(() => new Map<string, PmLabel>(data.labels.map((l) => [l.id, l])), [data.labels]);
  const doneIds = useMemo(() => new Set(data.columns.filter((c) => c.type === 'done').map((c) => c.id)), [data.columns]);
  const actions = useBoardActions(projectKey, boardKey, memberNames);

  const visible = useMemo(() => applyFilters(data.tasks, filters, me.userId, doneIds), [data.tasks, filters, me.userId, doneIds]);
  const byColumn = useMemo(() => tasksByColumn(visible, data.columns.map((c) => c.id)), [visible, data.columns]);

  // Filter state lives in the URL, written with replaceState so typing never triggers a server render.
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(window.location.search);
      if (value) next.set(key, value);
      else next.delete(key);
      window.history.replaceState(null, '', `${pathname}${next.toString() ? `?${next}` : ''}`);
    },
    [pathname],
  );

  const openTask = useCallback(
    (task: PmTask) => {
      const next = new URLSearchParams(window.location.search);
      next.set('task', task.ref);
      router.push(`${pathname}?${next}`, { scroll: false });
    },
    [pathname, router],
  );
  const closeTask = useCallback(() => {
    const next = new URLSearchParams(window.location.search);
    next.delete('task');
    router.push(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
  }, [pathname, router]);

  // "C" anywhere in the project area adds a task to the first column.
  const [addingIn, setAddingIn] = useState<string | null>(null);
  useEffect(() => {
    const onNew = () => {
      if (data.columns[0]) setAddingIn(data.columns[0].id);
    };
    window.addEventListener('pm:new-task', onNew);
    return () => window.removeEventListener('pm:new-task', onNew);
  }, [data.columns]);

  // --- Drag and drop -------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );
  const [dragging, setDragging] = useState<PmTask | null>(null);

  function onDragStart(e: DragStartEvent) {
    setDragging(data.tasks.find((t) => t.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const task = data.tasks.find((t) => t.id === active.id);
    if (!task) return;

    const overTask = data.tasks.find((t) => t.id === over.id);
    const targetColumnId = overTask ? overTask.columnId : String(over.id);
    if (!data.columns.some((c) => c.id === targetColumnId)) return;

    // Neighbours are taken from what is on screen (filters applied), minus the dragged card.
    const list = (byColumn.get(targetColumnId) ?? []).filter((t) => t.id !== task.id);
    let insertAt = list.length;
    if (overTask) {
      const overIdx = list.findIndex((t) => t.id === overTask.id);
      const sourceList = byColumn.get(task.columnId) ?? [];
      const movingDown = task.columnId === targetColumnId && sourceList.findIndex((t) => t.id === task.id) < sourceList.findIndex((t) => t.id === overTask.id);
      insertAt = movingDown ? overIdx + 1 : overIdx;
    }
    actions.moveTask(task, targetColumnId, list[insertAt - 1]?.id ?? null);
  }

  const openTaskObj = taskRef ? data.tasks.find((t) => t.ref === taskRef) : undefined;
  const filtered = hasFilters(filters);

  return (
    <div className="flex h-full flex-col">
      <BoardHeader
        data={data}
        me={me}
        filters={filters}
        view={view}
        setParam={setParam}
        clearFilters={() => {
          const next = new URLSearchParams(window.location.search);
          FILTER_KEYS.forEach((k) => next.delete(k));
          window.history.replaceState(null, '', `${pathname}${next.toString() ? `?${next}` : ''}`);
        }}
        onRefetch={actions.refetch}
      />

      {view === 'board' ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 pt-1 thin-scrollbar">
            {data.columns.map((column, i) => (
              <Column
                key={column.id}
                column={column}
                index={i}
                columns={data.columns}
                tasks={byColumn.get(column.id) ?? []}
                totalInColumn={data.tasks.filter((t) => t.columnId === column.id).length}
                filtered={filtered}
                labels={labelMap}
                projectKey={projectKey}
                olderDone={column.type === 'done' ? data.olderDone : 0}
                showOlder={showOlder}
                onToggleOlder={() => setParam(OLD_DONE_PARAM, showOlder ? null : '1')}
                adding={addingIn === column.id}
                setAdding={(on) => setAddingIn(on ? column.id : null)}
                onAdd={(title) => actions.createTask(column.id, title, filters.assignee === 'me' ? { assigneeId: me.userId } : {})}
                onOpen={openTask}
                onChanged={actions.refetch}
              />
            ))}
          </div>
          <DragOverlay>
            {dragging ? (
              <div className="rounded-md border border-primary bg-surface px-2.5 py-2">
                <CardBody task={dragging} labels={labelMap} done={doneIds.has(dragging.columnId)} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <ListView tasks={visible} data={data} onOpen={openTask} />
      )}

      <TaskDrawer
        taskRef={taskRef}
        initialTask={openTaskObj}
        data={data}
        me={me}
        actions={actions}
        onClose={closeTask}
      />
    </div>
  );
}

function Column({
  column,
  index,
  columns,
  tasks,
  totalInColumn,
  filtered,
  labels,
  projectKey,
  olderDone,
  showOlder,
  onToggleOlder,
  adding,
  setAdding,
  onAdd,
  onOpen,
  onChanged,
}: {
  column: PmColumn;
  index: number;
  columns: PmColumn[];
  tasks: PmTask[];
  totalInColumn: number;
  filtered: boolean;
  labels: Map<string, PmLabel>;
  projectKey: string;
  olderDone: number;
  showOlder: boolean;
  onToggleOlder: () => void;
  adding: boolean;
  setAdding: (on: boolean) => void;
  onAdd: (title: string) => void;
  onOpen: (task: PmTask) => void;
  onChanged: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const done = column.type === 'done';

  return (
    <section
      ref={setNodeRef}
      aria-label={column.name}
      className={cn(
        'flex w-72 shrink-0 snap-start flex-col rounded-md border border-border bg-sidebar sm:w-72',
        isOver && 'border-primary/60',
      )}
    >
      <header className="flex items-center gap-2 px-3 py-2">
        <h2 className="text-sm font-medium text-text">{column.name}</h2>
        <span className="text-xs tabular-nums text-muted">{filtered ? `${tasks.length} of ${totalInColumn}` : tasks.length}</span>
        <div className="ml-auto flex items-center gap-0.5">
          <button aria-label={`Add task to ${column.name}`} className="flex h-6 w-6 items-center justify-center rounded-sm text-muted hover:bg-black/[0.05] hover:text-text" onClick={() => setAdding(true)}>
            <Plus size={14} />
          </button>
          <ColumnMenu column={column} index={index} columns={columns} onChanged={onChanged} />
        </div>
      </header>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[40px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 thin-scrollbar">
          {tasks.map((t) => (
            <SortableTaskCard key={t.id} task={t} labels={labels} done={done} onOpen={onOpen} />
          ))}
          {tasks.length === 0 && !adding && (
            <p className="px-1 py-2 text-xs text-muted">{filtered ? 'No tasks match the filters.' : 'No tasks yet. Press C to add one.'}</p>
          )}
          {done && olderDone > 0 && (
            <button className="rounded-sm px-1 py-1 text-left text-xs text-muted hover:text-text" onClick={onToggleOlder}>
              {showOlder ? 'Hide older completed tasks' : `${olderDone} older completed ${olderDone === 1 ? 'task' : 'tasks'}`}
            </button>
          )}
          {adding && <InlineAdd onAdd={onAdd} onDone={() => setAdding(false)} />}
        </div>
      </SortableContext>

      {!adding && (
        <button className="mx-2 mb-2 flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-left text-xs text-muted hover:bg-black/[0.04] hover:text-text" onClick={() => setAdding(true)}>
          <Plus size={12} /> Add task
        </button>
      )}
    </section>
  );
}

function InlineAdd({ onAdd, onDone }: { onAdd: (title: string) => void; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <input
      ref={ref}
      value={title}
      maxLength={300}
      placeholder="Task title, then Enter"
      aria-label="New task title"
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && title.trim()) {
          onAdd(title.trim());
          setTitle('');
        } else if (e.key === 'Escape') onDone();
      }}
      onBlur={() => !title.trim() && onDone()}
      className="rounded-md border border-primary bg-surface px-2.5 py-2 text-sm text-text outline-none placeholder:text-muted"
    />
  );
}

