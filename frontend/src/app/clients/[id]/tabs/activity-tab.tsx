import { LocalRelativeDay } from '@/components/ui/local-time';
import type { ClientActivity } from '../../types';

export function ActivityTab({ activity }: { activity: ClientActivity[] }) {
  if (activity.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No activity recorded yet.</p>;
  }
  return (
    <div className="flex flex-col">
      {activity.map((a, i) => (
        <div key={a.id} className="relative flex gap-3 pb-5 pl-1 last:pb-0">
          {i !== activity.length - 1 && <div className="absolute left-[7px] top-3 h-full w-px bg-border" />}
          <div className="relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-surface" />
          <div>
            <div className="text-xs font-medium text-muted">
              <LocalRelativeDay iso={a.createdAt} />
            </div>
            <div className="text-sm text-text">
              <span className="font-medium">{a.actorName}</span> {a.description.charAt(0).toLowerCase() + a.description.slice(1)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
