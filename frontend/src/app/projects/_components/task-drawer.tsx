'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { ChevronRight, MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { pm, pollEvery } from '@/lib/pm/client';
import { nextColor } from '@/lib/pm/colors';
import { activityText, relativeTime } from '@/lib/pm/format';
import type { useBoardActions } from '@/lib/pm/use-board-actions';
import type { BoardData, PmLabel, PmMe, PmTask, Priority, TaskDetail, TaskUpdate } from '@/lib/pm/types';
import { AssigneePicker } from './assignee-picker';
import { ColorPicker } from './color-picker';
import { ConfirmDialog } from './dialogs';
import { useToast } from './providers';

const MarkdownView = dynamic(() => import('@/components/ui/markdown-view').then((m) => m.MarkdownView), { ssr: false });

const FIELD = 'h-8 w-full rounded-md border border-border bg-surface px-2 text-sm text-text outline-none focus:border-primary';
const ITEM = 'flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-text outline-none data-[highlighted]:bg-black/[0.05]';

type Actions = ReturnType<typeof useBoardActions>;

export function TaskDrawer({
  taskRef,
  initialTask,
  data,
  me,
  actions,
  onClose,
}: {
  taskRef: string | null;
  initialTask?: PmTask;
  data: BoardData;
  me: PmMe;
  actions: Actions;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={!!taskRef} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-surface outline-none sm:w-[520px]"
        >
          <Dialog.Title className="sr-only">{taskRef ?? 'Task'}</Dialog.Title>
          {taskRef && <DrawerBody key={taskRef} taskRef={taskRef} initialTask={initialTask} data={data} me={me} actions={actions} onClose={onClose} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DrawerBody({
  taskRef,
  initialTask,
  data,
  me,
  actions,
  onClose,
}: {
  taskRef: string;
  initialTask?: PmTask;
  data: BoardData;
  me: PmMe;
  actions: Actions;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: detail, isError } = useQuery({
    queryKey: ['task', taskRef],
    queryFn: () => pm<TaskDetail>(`/tasks/${taskRef}`),
    refetchInterval: pollEvery(10_000),
  });

  // Prefer the board's copy: it carries this session's optimistic edits.
  const boardTask = data.tasks.find((t) => t.ref === taskRef) ?? initialTask;
  const task = boardTask ?? detail?.task;

  const [title, setTitle] = useState(task?.title ?? '');
  const [desc, setDesc] = useState(task?.description ?? '');
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Long histories stay folded until asked for; the drawer is re-created per task, so each task starts closed.
  const [activityOpen, setActivityOpen] = useState(false);
  // Label management: show a delete button on each label, and confirm before removing one.
  const [editingLabels, setEditingLabels] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState<PmLabel | null>(null);
  const [seeded, setSeeded] = useState(!!task);

  useEffect(() => {
    if (!seeded && task) {
      setTitle(task.title);
      setDesc(task.description ?? '');
      setSeeded(true);
    }
  }, [seeded, task]);

  const columns = data.columns;
  const doneIds = useMemo(() => new Set(columns.filter((c) => c.type === 'done').map((c) => c.id)), [columns]);

  if (isError && !task) {
    return (
      <div className="p-6 text-sm text-muted">
        This task was not found. It may have been deleted.
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }
  if (!task) return <div className="p-6 text-sm text-muted">Loading task</div>;

  const canDelete = me.role === 'admin' || task.createdBy === me.userId;

  function setStatus(columnId: string) {
    if (!task || columnId === task.columnId) return;
    const last = data.tasks.filter((t) => t.columnId === columnId && t.id !== task.id).sort((a, b) => b.position - a.position)[0];
    actions.moveTask(task, columnId, last?.id ?? null);
  }

  async function postUpdate(body: string) {
    const optimistic: TaskUpdate = { id: `tmp-${Date.now()}`, taskId: task!.id, authorId: me.userId, authorName: me.name, body, createdAt: new Date().toISOString() };
    qc.setQueryData<TaskDetail>(['task', taskRef], (d) => (d ? { ...d, updates: [optimistic, ...d.updates] } : d));
    try {
      await pm(`/tasks/${taskRef}/updates`, { method: 'POST', body: { body } });
      qc.invalidateQueries({ queryKey: ['task', taskRef] });
      actions.refetch();
    } catch (e) {
      qc.invalidateQueries({ queryKey: ['task', taskRef] });
      toast((e as Error).message);
    }
  }

  return (
    <>
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="text-sm tabular-nums text-muted">{task.ref}</span>
        <div className="ml-auto flex items-center gap-1">
          <Menu.Root>
            <Menu.Trigger asChild>
              <button aria-label="Task options" className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/[0.05] hover:text-text">
                <MoreHorizontal size={16} />
              </button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content align="end" sideOffset={4} className="z-[60] min-w-40 rounded-lg border border-border bg-surface p-1">
                <Menu.Item
                  className={ITEM}
                  onSelect={() => {
                    actions.archiveTask(task);
                    onClose();
                  }}
                >
                  Archive
                </Menu.Item>
                {canDelete && (
                  <Menu.Item className={`${ITEM} text-danger`} onSelect={() => setConfirmDelete(true)}>
                    Delete
                  </Menu.Item>
                )}
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
          <Dialog.Close aria-label="Close task" className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/[0.05] hover:text-text">
            <X size={16} />
          </Dialog.Close>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 thin-scrollbar">
        <input
          aria-label="Title"
          value={title}
          maxLength={300}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title.trim() !== task.title && actions.patchTask(task, { title: title.trim() })}
          className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-lg font-semibold text-text outline-none hover:border-border focus:border-primary"
        />

        <dl className="mt-4 grid grid-cols-[90px_1fr] items-center gap-x-3 gap-y-2.5 text-sm">
          <dt className="text-muted">Status</dt>
          <dd>
            <select aria-label="Status" className={FIELD} value={task.columnId} onChange={(e) => setStatus(e.target.value)}>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </dd>
          <dt className="self-start pt-1 text-muted">Assignees</dt>
          <dd>
            <AssigneePicker assignees={task.assignees} members={data.members} onChange={(assigneeIds) => actions.patchTask(task, { assigneeIds })} />
          </dd>
          <dt className="text-muted">Priority</dt>
          <dd>
            <select aria-label="Priority" className={FIELD} value={task.priority} onChange={(e) => actions.patchTask(task, { priority: e.target.value as Priority })}>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </dd>
          <dt className="text-muted">Due date</dt>
          <dd className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Due date"
              className={cn(FIELD, 'tabular-nums', task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && !doneIds.has(task.columnId) && 'border-danger text-danger')}
              value={task.dueDate ?? ''}
              onChange={(e) => actions.patchTask(task, { dueDate: e.target.value || null })}
            />
            {task.dueDate && (
              <button className="text-xs text-muted hover:text-text" onClick={() => actions.patchTask(task, { dueDate: null })}>
                Clear
              </button>
            )}
          </dd>
          <dt className="self-start pt-1 text-muted">Labels</dt>
          <dd className="flex flex-wrap items-center gap-1.5">
            {data.labels.map((l) => {
              const on = task.labelIds.includes(l.id);
              return (
                <span key={l.id} className="inline-flex items-center">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => actions.patchTask(task, { labelIds: on ? task.labelIds.filter((x) => x !== l.id) : [...task.labelIds, l.id] })}
                    className={cn('rounded-full border px-2 py-0.5 text-xs', on ? 'border-primary bg-primary-tint text-primary-dark' : 'border-border text-muted hover:text-text')}
                  >
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: l.color }} aria-hidden />
                    {l.name}
                  </button>
                  {editingLabels && (
                    <button
                      type="button"
                      aria-label={`Delete label ${l.name}`}
                      onClick={() => setLabelToDelete(l)}
                      className="-ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-white hover:opacity-80"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  )}
                </span>
              );
            })}
            <NewLabel projectKey={task.projectKey} usedColors={data.labels.map((l) => l.color)} onCreated={actions.refetch} />
            {data.labels.length > 0 && (
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => setEditingLabels((e) => !e)}>
                {editingLabels ? 'Done' : 'Edit labels'}
              </button>
            )}
          </dd>
        </dl>

        <section className="mt-5">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-sm font-medium text-text">Description</h3>
            <button className="text-xs text-primary hover:underline" onClick={() => setPreview((p) => !p)}>
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {preview ? (
            <div className="min-h-[96px] rounded-md border border-border px-3 py-2">{desc.trim() ? <MarkdownView content={desc} /> : <p className="text-sm text-muted">Nothing to preview.</p>}</div>
          ) : (
            <textarea
              aria-label="Description"
              value={desc}
              rows={5}
              maxLength={20000}
              placeholder="Add details. Markdown is supported."
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => desc !== (task.description ?? '') && actions.patchTask(task, { description: desc })}
              className="w-full resize-y rounded-md border border-border bg-transparent px-3 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
            />
          )}
        </section>

        <section className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-text">Work updates</h3>
          <UpdateComposer onPost={postUpdate} />
          <ul className="mt-3 flex flex-col gap-3">
            {(detail?.updates ?? []).map((u) => (
              <li key={u.id} className="flex gap-2.5">
                <Avatar name={u.authorName} size="sm" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">
                    <span className="font-medium text-text">{u.authorName}</span> · {relativeTime(u.createdAt)}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-text">{u.body}</p>
                </div>
              </li>
            ))}
            {detail && detail.updates.length === 0 && <li className="text-sm text-muted">No updates yet. Post what you did and what is blocking you.</li>}
          </ul>
        </section>

        <section className="mt-6 pb-4">
          <button
            type="button"
            aria-expanded={activityOpen}
            aria-controls="task-activity-log"
            onClick={() => setActivityOpen((o) => !o)}
            className="flex w-full items-center gap-1.5 rounded-md py-1 text-left text-sm font-medium text-text hover:text-muted"
          >
            <ChevronRight size={16} className={cn('shrink-0 transition-transform duration-150', activityOpen && 'rotate-90')} />
            Activity
            {detail && <span className="font-normal tabular-nums text-muted">{detail.activity.length}</span>}
          </button>
          {activityOpen && (
            <ul id="task-activity-log" className="mt-2 flex flex-col gap-1.5 pl-[22px]">
              {(detail?.activity ?? []).map((a) => (
                <li key={a.id} className="text-xs text-muted">
                  <span className="font-medium text-text">{a.actorName}</span> {activityText(a.type, a.meta)} · {relativeTime(a.createdAt)}
                </li>
              ))}
              {detail && detail.activity.length === 0 && <li className="text-xs text-muted">No activity yet.</li>}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${task.ref}?`}
        body="The task, its updates and its activity are removed for everyone."
        confirmLabel="Delete task"
        danger
        onConfirm={() => {
          actions.deleteTask(task);
          onClose();
        }}
      />
      <ConfirmDialog
        open={labelToDelete !== null}
        onOpenChange={(o) => !o && setLabelToDelete(null)}
        title={`Delete the label "${labelToDelete?.name ?? ''}"?`}
        body="It is removed from every task in this project. The tasks themselves are not touched. This cannot be undone."
        confirmLabel="Delete label"
        danger
        onConfirm={() => {
          if (labelToDelete) actions.deleteLabel(labelToDelete);
          setLabelToDelete(null);
        }}
      />
    </>
  );
}

function UpdateComposer({ onPost }: { onPost: (body: string) => void }) {
  const [body, setBody] = useState('');
  const submit = () => {
    if (!body.trim()) return;
    onPost(body.trim());
    setBody('');
  };
  return (
    <div>
      <textarea
        aria-label="Post a work update"
        value={body}
        rows={3}
        maxLength={5000}
        placeholder="Post a work update"
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        className="w-full resize-y rounded-md border border-border bg-transparent px-3 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
      />
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-muted">Ctrl Enter to post</span>
        <Button size="sm" disabled={!body.trim()} onClick={submit}>
          Post update
        </Button>
      </div>
    </div>
  );
}

/**
 * Makes a new label for the project. A colour nobody in the project is using yet is picked
 * automatically; the swatch lets the person choose any of the palette instead.
 */
function NewLabel({ projectKey, usedColors, onCreated }: { projectKey: string; usedColors: string[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const { toast } = useToast();

  function start() {
    setColor(nextColor(usedColors));
    setName('');
    setOpen(true);
  }

  async function create() {
    if (!name.trim()) return;
    try {
      await pm(`/projects/${projectKey}/labels`, { method: 'POST', body: { name: name.trim(), color } });
      onCreated();
    } catch (err) {
      toast((err as Error).message);
    }
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted hover:text-text" onClick={start}>
        New label
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-surface py-0.5 pl-1 pr-1.5">
      <ColorPicker compact value={color} onChange={setColor} label="Label colour" />
      <input
        autoFocus
        value={name}
        maxLength={40}
        aria-label="New label name"
        placeholder="Label name"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter') create();
        }}
        className="h-5 w-24 bg-transparent px-1 text-xs text-text outline-none placeholder:text-muted"
      />
      <button type="button" aria-label="Add label" disabled={!name.trim()} onClick={create} className="text-xs font-medium text-primary hover:underline disabled:opacity-40">
        Add
      </button>
      <button type="button" aria-label="Cancel new label" onClick={() => setOpen(false)} className="text-muted hover:text-text">
        <X size={12} />
      </button>
    </span>
  );
}
