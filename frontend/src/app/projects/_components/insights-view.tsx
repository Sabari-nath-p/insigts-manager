'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import * as Popover from '@radix-ui/react-popover';
import { Download, Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { pm, qs, pollEvery } from '@/lib/pm/client';
import { PRIORITY_COLOR, PRIORITY_LABEL, formatDue, relativeTime, activityText } from '@/lib/pm/format';
import type { InsightsData, MyStats, PmProject, TaskActivity } from '@/lib/pm/types';

const chartFallback = () => <div className="h-[220px] animate-pulse rounded-md bg-black/[0.04]" aria-hidden />;
const ThroughputChart = dynamic(() => import('./insights-charts').then((m) => m.ThroughputChart), { ssr: false, loading: chartFallback });
const BurnupChart = dynamic(() => import('./insights-charts').then((m) => m.BurnupChart), { ssr: false, loading: chartFallback });
const StatusChart = dynamic(() => import('./insights-charts').then((m) => m.StatusChart), { ssr: false, loading: chartFallback });

type Params = { range?: string; from?: string; to?: string; project?: string; member?: string };

const PRESETS: Array<[string, string]> = [
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['this-month', 'This month'],
  ['last-month', 'Last month'],
  ['custom', 'Custom'],
];
const SELECT = 'h-8 rounded-md border border-border bg-surface px-2 text-sm text-text outline-none focus:border-primary';

export function InsightsView({
  data,
  mine,
  projects,
  members,
  params,
}: {
  data: InsightsData;
  mine: MyStats;
  projects: PmProject[];
  members: Array<{ id: string; fullName: string }>;
  params: Params;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('daily');
  const preset = params.from && params.to ? 'custom' : (params.range ?? '30d');

  function update(patch: Partial<Params>) {
    const next = { ...params, ...patch };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) sp.set(k, v);
    router.push(`${pathname}${sp.toString() ? `?${sp}` : ''}`, { scroll: false });
  }

  const exportQuery = qs({ range: params.range, from: params.from, to: params.to, project: params.project, member: params.member });
  const s = data.summary;

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-2 text-xl font-semibold text-text">Insights</h1>
          <select
            aria-label="Date range"
            className={SELECT}
            value={preset}
            onChange={(e) => (e.target.value === 'custom' ? update({ range: undefined, from: data.range.from, to: data.range.to }) : update({ range: e.target.value, from: undefined, to: undefined }))}
          >
            {PRESETS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          {preset === 'custom' && (
            <>
              <input type="date" aria-label="From" className={cn(SELECT, 'tabular-nums')} value={params.from ?? data.range.from} max={params.to ?? data.range.to} onChange={(e) => e.target.value && update({ from: e.target.value, to: params.to ?? data.range.to })} />
              <span className="text-muted">to</span>
              <input type="date" aria-label="To" className={cn(SELECT, 'tabular-nums')} value={params.to ?? data.range.to} min={params.from ?? data.range.from} onChange={(e) => e.target.value && update({ to: e.target.value, from: params.from ?? data.range.from })} />
            </>
          )}
          <select aria-label="Project" className={SELECT} value={params.project ?? ''} onChange={(e) => update({ project: e.target.value || undefined })}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
          {data.scope.canMembers && (
            <select aria-label="Member" className={SELECT} value={params.member ?? ''} onChange={(e) => update({ member: e.target.value || undefined })}>
              <option value="">Everyone</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          )}
          <span className="ml-auto text-xs tabular-nums text-muted">
            {formatDue(data.range.from)} to {formatDue(data.range.to)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <Card label="Open tasks" value={s.open} />
          <Card label="Completed" value={s.completed} sub={s.completedChangePct === null ? `${s.completedPrev} before` : `${s.completedChangePct >= 0 ? '+' : ''}${s.completedChangePct}% vs previous`} />
          <Card label="Overdue" value={s.overdue} tone={s.overdue > 0 ? 'danger' : undefined} href={`/projects/my-work`} hint="Open My Work" />
          <Card label="Median cycle time" value={s.medianCycleDays === null ? '-' : `${s.medianCycleDays}d`} sub="Start to done" />
          {s.onTimeRate !== null && <Card label="On-time rate" value={`${s.onTimeRate}%`} sub="Done by due date" />}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel
            title="Throughput"
            actions={
              <div className="flex rounded-md border border-border p-0.5 text-xs" role="group" aria-label="Granularity">
                {(['daily', 'weekly'] as const).map((g) => (
                  <button key={g} aria-pressed={granularity === g} onClick={() => setGranularity(g)} className={cn('rounded-sm px-2 py-0.5', granularity === g ? 'bg-primary-tint font-medium text-primary-dark' : 'text-muted')}>
                    {g === 'daily' ? 'Day' : 'Week'}
                  </button>
                ))}
              </div>
            }
            takeaway={data.takeaways.throughput}
          >
            {s.completed === 0 ? <Empty>No completed tasks in this range.</Empty> : <ThroughputChart data={data.throughput[granularity]} />}
          </Panel>
          <Panel title="Burn-up" takeaway={data.takeaways.burnup}>
            <BurnupChart data={data.burnup} />
          </Panel>
          <Panel title="Status by project">
            {data.statusDistribution.length === 0 ? <Empty>No tasks yet.</Empty> : <StatusChart data={data.statusDistribution} />}
          </Panel>
          <Panel title="Priority mix of open tasks">
            <PriorityMix data={data.priorityMix} />
          </Panel>
        </div>

        {data.workload && (
          <Panel
            className="mt-4"
            title="Workload by member"
            takeaway={data.takeaways.workload ?? undefined}
            actions={<CsvLink href={`/api/pm/insights/export/workload${exportQuery}`} />}
          >
            <Table
              head={['Member', 'Open', 'Urgent', 'High', 'Medium', 'Low', '']}
              empty="No open tasks."
              rows={data.workload.map((w) => [
                w.name,
                <b key="o" className="tabular-nums">{w.open}</b>,
                w.urgent,
                w.high,
                w.medium,
                w.low,
                w.highLoad ? <span key="h" className="rounded-sm bg-[var(--badge-yellow-bg)] px-1.5 py-0.5 text-xs text-[var(--badge-yellow-text)]">High load</span> : '',
              ])}
              numeric={[1, 2, 3, 4, 5]}
            />
          </Panel>
        )}

        <Panel className="mt-4" title="Stuck work" takeaway={data.takeaways.stuck} actions={<CsvLink href={`/api/pm/insights/export/stuck${exportQuery}`} />}>
          <Table
            head={['Task', 'Title', 'Column', 'Assignee', 'Days idle']}
            empty="Nothing is stuck."
            rows={data.stuck.slice(0, 50).map((t) => [
              <Link key="r" href={`/projects/${t.ref.split('-')[0]}?task=${t.ref}`} className="tabular-nums text-primary hover:underline">{t.ref}</Link>,
              t.title,
              t.column,
              t.assignee ?? <span key="u" className="text-muted">Unassigned</span>,
              t.daysIdle,
            ])}
            numeric={[4]}
          />
        </Panel>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Due soon and overdue" takeaway={data.takeaways.due}>
            {data.dueSoon.length === 0 ? (
              <Empty>Nothing is due in the next 14 days.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {data.dueSoon.slice(0, 30).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className={cn('w-14 shrink-0 text-xs tabular-nums', t.overdue ? 'font-medium text-danger' : 'text-muted')}>{formatDue(t.dueDate)}</span>
                    <Link href={`/projects/${t.ref.split('-')[0]}?task=${t.ref}`} className="min-w-0 flex-1 truncate text-text hover:underline">
                      <span className="mr-1.5 text-xs tabular-nums text-muted">{t.ref}</span>
                      {t.title}
                    </Link>
                    <span className="hidden truncate text-xs text-muted sm:inline">{t.assignee}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <MyStatsPanel mine={mine} />
        </div>

        <Panel
          className="mt-4"
          title="Project health"
          actions={
            <>
              <HowCalculated />
              <CsvLink href={`/api/pm/insights/export/health${exportQuery}`} />
            </>
          }
        >
          <Table
            head={['Project', 'Open', 'Done in range', 'Overdue', 'Stuck', 'Status']}
            empty="No projects yet."
            rows={data.health.map((h) => [
              <Link key="p" href={`/projects/${h.key}`} className="flex items-center gap-2 text-text hover:underline">
                <span className="h-2 w-2 rounded-full" style={{ background: h.color }} aria-hidden />
                {h.name}
              </Link>,
              h.open,
              h.doneInRange,
              h.overdue,
              h.stuck,
              <HealthPill key="s" status={h.status} />,
            ])}
            numeric={[1, 2, 3, 4]}
          />
        </Panel>

        <ActivityFeed project={params.project} member={data.scope.canMembers ? params.member : undefined} projects={projects} />
      </div>
    </div>
  );
}

function Card({ label, value, sub, tone, href, hint }: { label: string; value: number | string; sub?: string; tone?: 'danger'; href?: string; hint?: string }) {
  const body = (
    <>
      <p className="text-xs text-muted">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', tone === 'danger' ? 'text-danger' : 'text-text')}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </>
  );
  const cls = 'rounded-md border border-border bg-surface px-3 py-3';
  return href ? (
    <Link href={href} title={hint} className={cn(cls, 'hover:border-muted/50')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Panel({ title, takeaway, actions, className, children }: { title: string; takeaway?: string; actions?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('rounded-md border border-border bg-surface p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-text">{title}</h2>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {children}
      {takeaway && <p className="mt-3 text-xs text-muted">{takeaway}</p>}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted">{children}</p>;
}

function CsvLink({ href }: { href: string }) {
  return (
    <a href={href} download className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-text">
      <Download size={12} /> CSV
    </a>
  );
}

function Table({ head, rows, empty, numeric = [] }: { head: string[]; rows: React.ReactNode[][]; empty: string; numeric?: number[] }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted">
            {head.map((h, i) => (
              <th key={i} className={cn('py-1.5 pr-3', numeric.includes(i) && 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {r.map((c, j) => (
                <td key={j} className={cn('py-1.5 pr-3 text-text', numeric.includes(j) && 'text-right tabular-nums')}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HealthPill({ status }: { status: 'On track' | 'At risk' | 'Behind' }) {
  const style = status === 'On track' ? ['--badge-green-bg', '--badge-green-text'] : status === 'At risk' ? ['--badge-yellow-bg', '--badge-yellow-text'] : ['--badge-red-bg', '--badge-red-text'];
  return (
    <span className="rounded-sm px-1.5 py-0.5 text-xs font-medium" style={{ background: `var(${style[0]})`, color: `var(${style[1]})` }}>
      {status}
    </span>
  );
}

function HowCalculated() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:text-text">
          <Info size={12} /> How this is calculated
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-72 rounded-md border border-border bg-surface p-3 text-xs text-text outline-none">
          <ul className="flex flex-col gap-1.5">
            <li><b>Behind:</b> more than 25% of open tasks are overdue.</li>
            <li><b>At risk:</b> more than 10% of open tasks are overdue, or more than 3 tasks are stuck.</li>
            <li><b>On track:</b> everything else.</li>
            <li><b>Stuck:</b> open and not moved or updated for more than 5 days.</li>
            <li><b>Open:</b> not archived and not in a Done column.</li>
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function PriorityMix({ data }: { data: InsightsData['priorityMix'] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ul className="flex flex-col gap-2.5 py-1">
      {data.map((d) => (
        <li key={d.priority} className="flex items-center gap-3 text-sm">
          <span className="w-16 text-muted">{PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL]}</span>
          <span className="h-2 flex-1 rounded-sm bg-black/[0.05]">
            <span className="block h-2 rounded-sm" style={{ width: `${(d.count / max) * 100}%`, background: PRIORITY_COLOR[d.priority as keyof typeof PRIORITY_COLOR] }} />
          </span>
          <span className="w-8 text-right tabular-nums text-text">{d.count}</span>
        </li>
      ))}
    </ul>
  );
}

function MyStatsPanel({ mine }: { mine: MyStats }) {
  const max = Math.max(1, ...mine.weekly.map((w) => w.count));
  return (
    <Panel title="My stats">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        {[
          ['Completed this week', mine.completedWeek],
          ['Completed this month', mine.completedMonth],
          ['Open assigned', mine.open],
          ['Overdue', mine.overdue],
          ['Median cycle time', mine.medianCycleDays === null ? '-' : `${mine.medianCycleDays}d`],
        ].map(([l, v]) => (
          <div key={l as string}>
            <dt className="text-xs text-muted">{l}</dt>
            <dd className="text-lg font-semibold tabular-nums text-text">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <p className="mb-1 text-xs text-muted">Completed per week, last 12 weeks</p>
        <div className="flex h-12 items-end gap-1" role="img" aria-label={`Completed per week: ${mine.weekly.map((w) => w.count).join(', ')}`}>
          {mine.weekly.map((w) => (
            <span key={w.date} title={`${formatDue(w.date)}: ${w.count}`} className="flex-1 rounded-sm bg-primary" style={{ height: `${Math.max(w.count ? 8 : 2, (w.count / max) * 100)}%`, opacity: w.count ? 1 : 0.25 }} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

function ActivityFeed({ project, member, projects }: { project?: string; member?: string; projects: PmProject[] }) {
  const { data = [] } = useQuery({
    queryKey: ['pm-activity', project ?? '', member ?? ''],
    queryFn: () => pm<Array<TaskActivity & { projectId: string }>>(`/activity${qs({ project, member })}`),
    refetchInterval: pollEvery(30_000),
  });
  const keys = new Map(projects.map((p) => [p.id, p.key]));
  return (
    <Panel className="mt-4 mb-8" title="Activity">
      {data.length === 0 ? (
        <Empty>No activity yet.</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((a) => (
            <li key={a.id} className="py-1.5 text-sm text-muted">
              <span className="font-medium text-text">{a.actorName}</span> {activityText(a.type, a.meta)}
              {a.taskRef && (
                <>
                  {' '}
                  <Link href={`/projects/${keys.get(a.projectId) ?? a.taskRef.split('-')[0]}?task=${a.taskRef}`} className="text-primary hover:underline">
                    <span className="tabular-nums">{a.taskRef}</span> {a.taskTitle}
                  </Link>
                </>
              )}
              <span className="ml-2 text-xs">{relativeTime(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
