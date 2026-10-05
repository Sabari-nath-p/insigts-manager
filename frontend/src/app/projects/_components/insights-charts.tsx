'use client';

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { InsightsData } from '@/lib/pm/types';

const AXIS = { fontSize: 11, fill: 'var(--color-muted)' };
const GRID = 'var(--color-border)';
const TIP = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, color: 'var(--color-text)' };
const PRIMARY = 'var(--color-primary)';
const NEUTRAL = '#9b9b9b';

function shortDate(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function ThroughputChart({ data }: { data: Array<{ date: string; count: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TIP} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => [v, 'Completed']} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="count" fill={PRIMARY} radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BurnupChart({ data }: { data: InsightsData['burnup'] }) {
  const rows = data.dates.map((date, i) => ({ date, created: data.created[i], completed: data.completed[i] }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TIP} labelFormatter={(l) => shortDate(String(l))} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="created" name="Created" stroke={NEUTRAL} strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="completed" name="Completed" stroke={PRIMARY} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const TYPE_COLORS: Record<string, string> = { todo: '#c9c7c3', doing: '#0075de', review: '#dd5b00', done: PRIMARY };

export function StatusChart({ data }: { data: InsightsData['statusDistribution'] }) {
  const rows = data.map((p) => {
    const row: Record<string, string | number> = { project: p.key };
    for (const c of p.columns) row[c.type] = ((row[c.type] as number) ?? 0) + c.count;
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 38 + 40)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis type="category" dataKey="project" tick={AXIS} tickLine={false} axisLine={false} width={48} />
        <Tooltip contentStyle={TIP} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {(['todo', 'doing', 'review', 'done'] as const).map((t) => (
          <Bar key={t} dataKey={t} name={t === 'todo' ? 'Todo' : t === 'doing' ? 'Doing' : t === 'review' ? 'Review' : 'Done'} stackId="s" fill={TYPE_COLORS[t]} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
