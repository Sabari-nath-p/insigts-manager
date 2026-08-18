import { Construction } from 'lucide-react';

/** Shown for tabs that depend on HRMS modules that don't exist yet (Projects, Tasks, Content
 * Calendar, Creative Approvals, Time Tracking, Shoot Schedule) — honest rather than faked. */
export function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
      <Construction size={22} className="text-muted" />
      <p className="text-sm font-medium text-text">{name} isn&rsquo;t tracked yet</p>
      <p className="max-w-sm text-sm text-muted">
        This tab will connect to the {name} module once it exists in this HRMS — it isn&rsquo;t duplicated here.
      </p>
    </div>
  );
}
