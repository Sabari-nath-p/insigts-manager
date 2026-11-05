'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cc } from '@/lib/content-calendar/client';
import { MONTHS, groupByClient, monthKey } from '@/lib/content-calendar/logic';
import type { CcCalendar } from '@/lib/content-calendar/types';
import { markDuplicates, rowsFromCalendar } from '@/lib/pm/calendar-import';
import { pm } from '@/lib/pm/client';
import { formatDue } from '@/lib/pm/format';
import { importTasks } from '@/lib/pm/run-import';
import type { BoardData, PmProject } from '@/lib/pm/types';
import { useToast } from './providers';

const FIELD = 'h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-text outline-none focus:border-primary';
const monthLabel = (c: Pick<CcCalendar, 'month' | 'year'>) => `${MONTHS[c.month]} ${c.year}`;

/** Picks the calendar that opens first: this month if it exists, otherwise the newest one. */
function firstChoice(calendars: CcCalendar[]): CcCalendar | null {
  if (calendars.length === 0) return null;
  const now = new Date();
  return calendars.find((c) => c.year === now.getFullYear() && c.month === now.getMonth()) ?? calendars.reduce((a, b) => (monthKey(b) > monthKey(a) ? b : a));
}

/**
 * Sets up a client's month in Projects. A project is a client, so this creates a project named after the client
 * (or adds to the client's active project, if there is one) and fills it with a task per planned post:
 * "Poster 1", "Poster 2", "Carousel 1", ... and an "SPL-" task per special day. Due dates and people are set afterwards.
 */
export function ImportCalendarDialog({ projects, onClose }: { projects: PmProject[]; onClose: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [calendars, setCalendars] = useState<CcCalendar[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [client, setClient] = useState('');
  const [calId, setCalId] = useState('');
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [made, setMade] = useState<Set<string>>(new Set());
  const [addToExisting, setAddToExisting] = useState(true);
  const [createdProject, setCreatedProject] = useState<PmProject | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    cc<CcCalendar[]>('/calendars')
      .then((list) => {
        setCalendars(list);
        const first = firstChoice(list);
        if (first) {
          setClient(first.client);
          setCalId(first.id);
        }
      })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  const groups = useMemo(() => groupByClient(calendars ?? []), [calendars]);
  const months = useMemo(() => groups.find((g) => g.name === client)?.items ?? [], [groups, client]);
  const cal = months.find((c) => c.id === calId) ?? null;

  // The client's project that is still running, if any. Archived ones are finished months, so they do not count.
  const match = useMemo(() => projects.find((p) => p.status === 'active' && p.name.trim().toLowerCase() === client.trim().toLowerCase()) ?? null, [projects, client]);
  const target = createdProject ?? (match && addToExisting ? match : null);

  // Looking inside an existing project lets repeat imports skip tasks that are already there.
  const board = useQuery({
    queryKey: ['board', target?.key, false],
    queryFn: () => pm<BoardData>(`/projects/${target!.key}/board`),
    enabled: !!target,
  });
  const checking = !!target && board.isLoading;

  const rows = useMemo(() => {
    if (!cal) return [];
    const all = rowsFromCalendar(cal);
    return target && board.data ? markDuplicates(all, board.data.tasks) : all;
  }, [cal, target, board.data]);

  // A new client or month starts clean.
  useEffect(() => {
    setMade(new Set());
    setError('');
    setCreatedProject(null);
    setAddToExisting(true);
  }, [calId]);

  // Every post that is not already a task starts ticked: for a new month, and again whenever the target project
  // changes (what counts as "already a task" depends on which project it is) or its tasks have been looked up.
  const lookedUp = !!board.data;
  useEffect(() => {
    setTicked(new Set(rows.filter((r) => !r.duplicate).map((r) => r.key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calId, target?.key, lookedUp]);

  function pickClient(name: string) {
    setClient(name);
    const items = groups.find((g) => g.name === name)?.items ?? [];
    setCalId(firstChoice(items)?.id ?? '');
  }

  const available = rows.filter((r) => !r.duplicate && !made.has(r.key));
  const chosen = available.filter((r) => ticked.has(r.key));
  const posts = rows.filter((r) => !r.special).length;
  const specials = rows.length - posts;

  function toggle(key: string) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function create() {
    if (!cal || chosen.length === 0) return;
    setBusy(true);
    setError('');
    setProgress(0);
    const result = await importTasks({
      target,
      newProjectName: client.trim(),
      allProjects: projects,
      tasks: chosen.map((r) => ({ title: r.title, description: r.description })),
      onProgress: setProgress,
    });
    setBusy(false);
    qc.invalidateQueries({ queryKey: ['projects'] });
    if (result.project) qc.invalidateQueries({ queryKey: ['board', result.project.key] });
    // Whatever was made stays made, so a retry never creates it twice, and never makes the project twice.
    if (result.project && !target) setCreatedProject(result.project);
    setMade((prev) => new Set([...prev, ...chosen.slice(0, result.created).map((r) => r.key)]));
    if (result.error || !result.project) {
      setError(result.project ? `Created ${result.created} of ${chosen.length}. Stopped: ${result.error}` : `Could not create the project: ${result.error}`);
      return;
    }
    toast(`Created ${result.created} ${result.created === 1 ? 'task' : 'tasks'} in ${result.project.name}`);
    router.push(`/projects/${result.project.key}`);
    onClose();
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !busy && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[6vh] z-50 flex max-h-[88vh] w-[min(94vw,560px)] -translate-x-1/2 flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-surface p-5 outline-none"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-text">Create from the Content Calendar</Dialog.Title>
            <Dialog.Close aria-label="Close" disabled={busy} className="text-muted hover:text-text disabled:opacity-40">
              <X size={16} />
            </Dialog.Close>
          </div>

          {loadError && <p className="text-sm text-danger">Could not load the Content Calendar: {loadError}</p>}
          {!calendars && !loadError && <p className="text-sm text-muted">Loading calendars&hellip;</p>}
          {calendars && calendars.length === 0 && <p className="text-sm text-muted">There are no content calendars yet. Add one on the Content Calendar page first.</p>}

          {calendars && calendars.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Client
                  <select className={FIELD} value={client} onChange={(e) => pickClient(e.target.value)} disabled={busy}>
                    {groups.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Month
                  <select className={FIELD} value={calId} onChange={(e) => setCalId(e.target.value)} disabled={busy}>
                    {months.map((c) => (
                      <option key={c.id} value={c.id}>
                        {monthLabel(c)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="rounded-md bg-bg px-3 py-2 text-sm text-text">
                {target ? (
                  <>
                    {createdProject ? 'Continues in the new project' : 'Adds to the existing project'} <b>{target.name}</b>.
                  </>
                ) : (
                  <>
                    Creates a new project <b>{client}</b>.
                  </>
                )}
                {match && !createdProject && !busy && (
                  <button type="button" className="ml-2 text-xs text-primary hover:underline" onClick={() => setAddToExisting((v) => !v)}>
                    {addToExisting ? 'Create a new project instead' : 'Add to the existing one instead'}
                  </button>
                )}
              </p>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                  <span>
                    {posts} {posts === 1 ? 'post' : 'posts'}
                    {specials > 0 && `, ${specials} special ${specials === 1 ? 'day' : 'days'}`}
                  </span>
                  {available.length > 0 && (
                    <span className="flex gap-3">
                      <button type="button" className="text-primary hover:underline" onClick={() => setTicked(new Set(available.map((r) => r.key)))}>
                        Select all
                      </button>
                      <button type="button" className="text-primary hover:underline" onClick={() => setTicked(new Set())}>
                        Select none
                      </button>
                    </span>
                  )}
                </div>
                {rows.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted">Nothing is planned in this month yet.</p>
                ) : (
                  <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
                    {rows.map((r) => {
                      const skipped = r.duplicate || made.has(r.key);
                      return (
                        <li key={r.key}>
                          <label className={`flex items-center gap-3 px-3 py-2 text-sm ${skipped ? 'cursor-default opacity-55' : 'cursor-pointer hover:bg-black/[0.02]'}`}>
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[color:var(--color-primary)]"
                              checked={!skipped && ticked.has(r.key)}
                              disabled={skipped || busy}
                              onChange={() => toggle(r.key)}
                            />
                            <span className="min-w-0 flex-1 truncate text-text">{r.title}</span>
                            <span className="shrink-0 text-xs tabular-nums text-muted">
                              {r.special ? 'On' : 'Posts'} {formatDue(r.postDate)}
                            </span>
                            {skipped && <span className="shrink-0 rounded-sm bg-[var(--badge-gray-bg)] px-1.5 text-xs text-muted">{made.has(r.key) ? 'Created' : 'Already a task'}</span>}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <p className="text-xs text-muted">The date shown is when it posts. Due dates and people are set afterwards, on the board.</p>
            </>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={create} disabled={busy || checking || chosen.length === 0}>
              {busy ? `Creating ${progress} of ${chosen.length}…` : checking ? 'Checking the project…' : `Create ${chosen.length} ${chosen.length === 1 ? 'task' : 'tasks'}`}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
