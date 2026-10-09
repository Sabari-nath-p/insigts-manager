import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/avatar';

const SHOWN = 3;

/** Overlapping avatars for everyone on a task; extra people collapse into a "+N" chip. */
export function AvatarStack({ people, className }: { people: Array<{ id: string; name: string }>; className?: string }) {
  if (people.length === 0) return null;
  const extra = people.length - SHOWN;
  return (
    <span className={cn('flex items-center', className)} title={people.map((p) => p.name).join(', ')}>
      {people.slice(0, SHOWN).map((p, i) => (
        <Avatar key={p.id} name={p.name} size="sm" className={cn('ring-2 ring-surface', i > 0 && '-ml-1.5')} />
      ))}
      {extra > 0 && (
        <span className="-ml-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-bg px-1 text-[10px] font-semibold tabular-nums text-muted ring-2 ring-surface">
          +{extra}
        </span>
      )}
    </span>
  );
}
