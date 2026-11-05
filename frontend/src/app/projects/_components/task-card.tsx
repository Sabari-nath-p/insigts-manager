'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AvatarStack } from './avatar-stack';
import { PRIORITY_COLOR, PRIORITY_LABEL, formatDue, isOverdue } from '@/lib/pm/format';
import type { PmLabel, PmTask } from '@/lib/pm/types';

export function CardBody({ task, labels, done }: { task: PmTask; labels: Map<string, PmLabel>; done: boolean }) {
  const overdue = isOverdue(task.dueDate, done);
  const taskLabels = task.labelIds.map((id) => labels.get(id)).filter((l): l is PmLabel => !!l);
  return (
    <>
      <div className="flex items-center gap-1.5 text-[11px] tabular-nums text-muted">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: PRIORITY_COLOR[task.priority] }}
          role="img"
          aria-label={`${PRIORITY_LABEL[task.priority]} priority`}
          title={`${PRIORITY_LABEL[task.priority]} priority`}
        />
        <span>{task.ref}</span>
      </div>
      <p className={cn('mt-1 text-sm leading-snug text-text', done && 'text-muted line-through decoration-muted/60')}>{task.title}</p>
      {taskLabels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {taskLabels.map((l) => (
            <span key={l.id} className="rounded-full border border-border px-2 text-[11px] text-muted">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: l.color }} aria-hidden />
              {l.name}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
        {task.dueDate && <span className={cn('tabular-nums', overdue && 'font-medium text-danger')}>{overdue ? 'Overdue ' : ''}{formatDue(task.dueDate)}</span>}
        {task.updateCount > 0 && (
          <span className="flex items-center gap-0.5 tabular-nums" title={`${task.updateCount} updates`}>
            <MessageSquare size={11} /> {task.updateCount}
          </span>
        )}
        <AvatarStack people={task.assignees} className="ml-auto" />
      </div>
    </>
  );
}

export function SortableTaskCard({
  task,
  labels,
  done,
  onOpen,
  selecting = false,
  selected = false,
  onToggle,
}: {
  task: PmTask;
  labels: Map<string, PmLabel>;
  done: boolean;
  onOpen: (task: PmTask) => void;
  /** Select mode: clicking a card ticks it instead of opening it, and cards cannot be dragged. */
  selecting?: boolean;
  selected?: boolean;
  onToggle?: (task: PmTask) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { columnId: task.columnId },
    disabled: task.id.startsWith('tmp-') || selecting,
  });
  const activate = () => (selecting ? onToggle?.(task) : onOpen(task));

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      // Select mode is not a drag list: drop the "sortable / disabled" hints the drag library adds.
      {...(selecting && { 'aria-disabled': undefined, 'aria-roledescription': undefined })}
      role={selecting ? 'checkbox' : 'button'}
      aria-checked={selecting ? selected : undefined}
      aria-label={`${task.ref} ${task.title}`}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || (selecting && e.key === ' ')) {
          e.preventDefault();
          activate();
        } else listeners?.onKeyDown?.(e);
      }}
      className={cn(
        'relative cursor-pointer rounded-lg border border-border bg-surface px-2.5 py-2 outline-none hover:border-muted/50 focus-visible:ring-2 focus-visible:ring-primary',
        isDragging && 'opacity-40',
        selected && 'border-primary bg-primary-tint/40 hover:border-primary',
      )}
    >
      {selecting && (
        <span
          aria-hidden
          className={cn('absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-sm border', selected ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface')}
        >
          {selected && <Check size={11} strokeWidth={3} />}
        </span>
      )}
      <CardBody task={task} labels={labels} done={done} />
    </div>
  );
}
