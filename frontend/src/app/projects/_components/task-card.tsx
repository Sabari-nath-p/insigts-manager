'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/avatar';
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
            <span key={l.id} className="rounded-sm border border-border px-1.5 text-[11px] text-muted">
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
        <span className="ml-auto">{task.assigneeName ? <Avatar name={task.assigneeName} size="sm" /> : null}</span>
      </div>
    </>
  );
}

export function SortableTaskCard({
  task,
  labels,
  done,
  onOpen,
}: {
  task: PmTask;
  labels: Map<string, PmLabel>;
  done: boolean;
  onOpen: (task: PmTask) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { columnId: task.columnId },
    disabled: task.id.startsWith('tmp-'),
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={`${task.ref} ${task.title}`}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(task);
        else listeners?.onKeyDown?.(e);
      }}
      className={cn(
        'cursor-pointer rounded-md border border-border bg-surface px-2.5 py-2 outline-none hover:border-muted/50 focus-visible:ring-2 focus-visible:ring-primary',
        isDragging && 'opacity-40',
      )}
    >
      <CardBody task={task} labels={labels} done={done} />
    </div>
  );
}
