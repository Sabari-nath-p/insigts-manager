import type { ClientActivity } from '../../types';

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today — ${time}`;
  if (isYesterday) return `Yesterday — ${time}`;
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} — ${time}`;
}

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
            <div className="text-xs font-medium text-muted">{formatTimestamp(a.createdAt)}</div>
            <div className="text-sm text-text">
              <span className="font-medium">{a.actorName}</span> {a.description.charAt(0).toLowerCase() + a.description.slice(1)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
