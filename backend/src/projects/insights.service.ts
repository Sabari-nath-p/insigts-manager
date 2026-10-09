import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PmAccessService } from './pm-access.service';
import { PmActor } from './pm-permissions';
import { DateRange, addDays, previousRange, resolveRange, todayUtc } from './pm-dates';
import { InsightsQueryDto } from './dto/pm.dto';
import {
  STUCK_DAYS,
  cumulative,
  fillDays,
  flagHighLoad,
  healthStatus,
  pctChange,
  plural,
  toCsv,
  toWeekly,
} from './insights-calc';

const n = (v: unknown): number => Number(v ?? 0);

/** Start of `range.from` and the exclusive end (day after `range.to`), as UTC datetimes. */
function bounds(range: DateRange) {
  return { start: new Date(`${range.from}T00:00:00Z`), end: new Date(`${addDays(range.to, 1)}T00:00:00Z`) };
}

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PmAccessService,
  ) {}

  /** Optional project / assignee narrowing applied to the task alias `t`. */
  private scope(projectId: string | null, memberId: string | null): Prisma.Sql {
    return Prisma.sql`${projectId ? Prisma.sql`AND t.projectId = ${projectId}` : Prisma.empty} ${
      memberId ? Prisma.sql`AND EXISTS (SELECT 1 FROM pm_task_assignees ta WHERE ta.taskId = t.id AND ta.userId = ${memberId})` : Prisma.empty
    }`;
  }

  private async medianCycleDays(range: DateRange, scope: Prisma.Sql): Promise<number | null> {
    const { start, end } = bounds(range);
    const rows = await this.prisma.$queryRaw<Array<{ days: number | null }>>`
      SELECT AVG(d) AS days FROM (
        SELECT d, ROW_NUMBER() OVER (ORDER BY d) AS rn, COUNT(*) OVER () AS cnt FROM (
          SELECT TIMESTAMPDIFF(SECOND, COALESCE(t.startedAt, t.createdAt), t.completedAt) / 86400 AS d
          FROM pm_tasks t
          WHERE t.completedAt >= ${start} AND t.completedAt < ${end} AND t.archivedAt IS NULL ${scope}
        ) x
      ) y WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2))`;
    const v = rows[0]?.days;
    return v === null || v === undefined ? null : Math.round(Number(v) * 10) / 10;
  }

  async insights(actor: PmActor, q: InsightsQueryDto) {
    const range = resolveRange(q.range, q.from, q.to);
    const prev = previousRange(range);
    const { start, end } = bounds(range);
    const today = todayUtc();
    const stuckCutoff = new Date(Date.now() - STUCK_DAYS * 86_400_000);
    const canMembers = this.access.can(actor, 'insights.members');

    const project = q.project ? await this.prisma.pmProject.findUnique({ where: { key: q.project.toUpperCase() } }) : null;
    const memberId = canMembers && q.member ? q.member : null;
    const scope = this.scope(project?.id ?? null, memberId);

    const openWhere = Prisma.sql`t.archivedAt IS NULL AND c.type <> 'done'`;
    const lastChange = Prisma.sql`COALESCE((SELECT MAX(a.createdAt) FROM pm_activity a WHERE a.taskId = t.id AND a.type IN ('task.created','task.moved','update.posted')), t.createdAt)`;

    const [
      openRow,
      doneRow,
      donePrevRow,
      overdueRow,
      onTimeRow,
      cycle,
      doneDaily,
      createdDaily,
      statusRows,
      workloadRows,
      stuckRows,
      dueRows,
      priorityRows,
      healthRows,
      projects,
    ] = await Promise.all([
      this.prisma.$queryRaw<Array<{ v: bigint }>>`SELECT COUNT(*) AS v FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId WHERE ${openWhere} ${scope}`,
      this.prisma.$queryRaw<Array<{ v: bigint }>>`SELECT COUNT(*) AS v FROM pm_tasks t WHERE t.archivedAt IS NULL AND t.completedAt >= ${start} AND t.completedAt < ${end} ${scope}`,
      (() => {
        const p = bounds(prev);
        return this.prisma.$queryRaw<Array<{ v: bigint }>>`SELECT COUNT(*) AS v FROM pm_tasks t WHERE t.archivedAt IS NULL AND t.completedAt >= ${p.start} AND t.completedAt < ${p.end} ${scope}`;
      })(),
      this.prisma.$queryRaw<Array<{ v: bigint }>>`SELECT COUNT(*) AS v FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId WHERE ${openWhere} AND t.dueDate < ${today} ${scope}`,
      this.prisma.$queryRaw<Array<{ total: bigint; ontime: bigint | null }>>`
        SELECT COUNT(*) AS total, SUM(DATE(t.completedAt) <= t.dueDate) AS ontime FROM pm_tasks t
        WHERE t.archivedAt IS NULL AND t.dueDate IS NOT NULL AND t.completedAt >= ${start} AND t.completedAt < ${end} ${scope}`,
      this.medianCycleDays(range, scope),
      this.prisma.$queryRaw<Array<{ d: string; v: bigint }>>`
        SELECT DATE_FORMAT(t.completedAt, '%Y-%m-%d') AS d, COUNT(*) AS v FROM pm_tasks t
        WHERE t.archivedAt IS NULL AND t.completedAt >= ${start} AND t.completedAt < ${end} ${scope} GROUP BY d`,
      this.prisma.$queryRaw<Array<{ d: string; v: bigint }>>`
        SELECT DATE_FORMAT(t.createdAt, '%Y-%m-%d') AS d, COUNT(*) AS v FROM pm_tasks t
        WHERE t.archivedAt IS NULL AND t.createdAt >= ${start} AND t.createdAt < ${end} ${scope} GROUP BY d`,
      this.prisma.$queryRaw<Array<{ projectId: string; name: string; type: string; v: bigint }>>`
        SELECT t.projectId AS projectId, c.name AS name, c.type AS type, COUNT(*) AS v
        FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId WHERE t.archivedAt IS NULL ${scope}
        GROUP BY t.projectId, c.name, c.type, c.position ORDER BY c.position`,
      canMembers
        ? this.prisma.$queryRaw<Array<{ assigneeId: string | null; priority: string; v: bigint }>>`
            SELECT ta.userId AS assigneeId, t.priority AS priority, COUNT(*) AS v
            FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId
            LEFT JOIN pm_task_assignees ta ON ta.taskId = t.id
            WHERE ${openWhere} ${scope}
            GROUP BY ta.userId, t.priority`
        : Promise.resolve([]),
      this.prisma.$queryRaw<Array<{ id: string; projectId: string; number: number; title: string; changedAt: Date; colName: string }>>`
        SELECT t.id AS id, t.projectId AS projectId, t.number AS number, t.title AS title,
               ${lastChange} AS changedAt, c.name AS colName
        FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId
        WHERE ${openWhere} AND ${lastChange} < ${stuckCutoff} ${scope}
        ORDER BY changedAt ASC LIMIT 200`,
      this.prisma.$queryRaw<Array<{ id: string; projectId: string; number: number; title: string; dueDate: string }>>`
        (SELECT t.id AS id, t.projectId AS projectId, t.number AS number, t.title AS title, t.dueDate AS dueDate
          FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId
          WHERE ${openWhere} AND t.dueDate < ${today} ${scope} ORDER BY t.dueDate DESC LIMIT 15)
        UNION ALL
        (SELECT t.id AS id, t.projectId AS projectId, t.number AS number, t.title AS title, t.dueDate AS dueDate
          FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId
          WHERE ${openWhere} AND t.dueDate >= ${today} AND t.dueDate <= ${addDays(today, 14)} ${scope} ORDER BY t.dueDate ASC LIMIT 100)`,
      this.prisma.$queryRaw<Array<{ priority: string; v: bigint }>>`
        SELECT t.priority AS priority, COUNT(*) AS v FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId
        WHERE ${openWhere} ${scope} GROUP BY t.priority`,
      this.prisma.$queryRaw<Array<{ projectId: string; open: bigint; overdue: bigint; stuck: bigint; done: bigint }>>`
        SELECT t.projectId AS projectId,
          SUM(c.type <> 'done') AS open,
          SUM(c.type <> 'done' AND t.dueDate < ${today}) AS overdue,
          SUM(c.type <> 'done' AND ${lastChange} < ${stuckCutoff}) AS stuck,
          SUM(t.completedAt >= ${start} AND t.completedAt < ${end}) AS done
        FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId
        WHERE t.archivedAt IS NULL ${scope} GROUP BY t.projectId`,
      this.prisma.pmProject.findMany({ select: { id: true, key: true, name: true, color: true, status: true }, orderBy: { name: 'asc' } }),
    ]);

    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const names = new Map(
      (await this.prisma.user.findMany({ where: { isActive: true }, select: { id: true, fullName: true } })).map((u) => [u.id, u.fullName]),
    );
    const refOf = (r: { projectId: string; number: number }) => `${projectMap.get(r.projectId)?.key ?? '?'}-${r.number}`;

    const doneCounts = new Map(doneDaily.map((r) => [r.d, n(r.v)]));
    const createdCounts = new Map(createdDaily.map((r) => [r.d, n(r.v)]));
    const throughputDaily = fillDays(range, doneCounts);
    const createdSeries = fillDays(range, createdCounts);
    const burn = { dates: throughputDaily.map((d) => d.date), created: cumulative(createdSeries), completed: cumulative(throughputDaily) };

    const completed = n(doneRow[0]?.v);
    const completedPrev = n(donePrevRow[0]?.v);
    const onTimeTotal = n(onTimeRow[0]?.total);
    // Everyone on each listed task, so a task shared by two people shows both names.
    const listedIds = [...stuckRows.map((r) => r.id), ...dueRows.map((r) => r.id)];
    const assignmentRows = listedIds.length
      ? await this.prisma.pmTaskAssignee.findMany({ where: { taskId: { in: listedIds } }, orderBy: { createdAt: 'asc' } })
      : [];
    const assignedTo = new Map<string, string[]>();
    for (const a of assignmentRows) assignedTo.set(a.taskId, [...(assignedTo.get(a.taskId) ?? []), a.userId]);
    const namesFor = (taskId: string) => (assignedTo.get(taskId) ?? []).map((id) => names.get(id) ?? 'Former member').join(', ') || null;

    const stuck = stuckRows.map((r) => ({
      id: r.id,
      ref: refOf(r),
      title: r.title,
      project: projectMap.get(r.projectId)?.name ?? '',
      column: r.colName,
      assigneeId: assignedTo.get(r.id)?.[0] ?? null,
      assignee: namesFor(r.id),
      daysIdle: Math.floor((Date.now() - new Date(r.changedAt).getTime()) / 86_400_000),
    }));

    const dueSoon = dueRows.map((r) => ({
      id: r.id,
      ref: refOf(r),
      title: r.title,
      dueDate: r.dueDate,
      overdue: r.dueDate < today,
      assignee: namesFor(r.id),
    }));

    const priorities = ['urgent', 'high', 'medium', 'low'];
    const priorityMix = priorities.map((p) => ({ priority: p, count: n(priorityRows.find((r) => r.priority === p)?.v) }));

    // Status distribution: one stacked bar per project, a segment per column.
    const statusByProject = new Map<string, Array<{ column: string; type: string; count: number }>>();
    for (const r of statusRows) {
      statusByProject.set(r.projectId, [...(statusByProject.get(r.projectId) ?? []), { column: r.name, type: r.type, count: n(r.v) }]);
    }
    const statusDistribution = [...statusByProject.entries()].map(([projectId, columns]) => ({
      project: projectMap.get(projectId)?.name ?? '',
      key: projectMap.get(projectId)?.key ?? '',
      columns,
    }));

    let workload: Array<{ id: string | null; name: string; open: number; urgent: number; high: number; medium: number; low: number; highLoad: boolean }> | null = null;
    if (canMembers) {
      const byMember = new Map<string | null, { open: number; urgent: number; high: number; medium: number; low: number }>();
      for (const r of workloadRows) {
        const cur = byMember.get(r.assigneeId) ?? { open: 0, urgent: 0, high: 0, medium: 0, low: 0 };
        cur.open += n(r.v);
        cur[r.priority as 'urgent' | 'high' | 'medium' | 'low'] += n(r.v);
        byMember.set(r.assigneeId, cur);
      }
      const flagged = flagHighLoad([...byMember.entries()].filter(([id]) => id).map(([id, v]) => ({ id: id as string, open: v.open })));
      workload = [...byMember.entries()]
        .map(([id, v]) => ({ id, name: id ? (names.get(id) ?? 'Former member') : 'Unassigned', ...v, highLoad: !!id && flagged.has(id) }))
        .sort((a, b) => b.open - a.open);
    }

    const health = healthRows
      .map((r) => {
        const p = projectMap.get(r.projectId);
        return {
          key: p?.key ?? '',
          name: p?.name ?? '',
          color: p?.color ?? '#787671',
          archived: p?.status === 'archived',
          open: n(r.open),
          doneInRange: n(r.done),
          overdue: n(r.overdue),
          stuck: n(r.stuck),
          status: healthStatus(n(r.open), n(r.overdue), n(r.stuck)),
        };
      })
      .filter((r) => !r.archived)
      .sort((a, b) => a.name.localeCompare(b.name));

    const stuckTotal = healthRows.reduce((sum, r) => sum + n(r.stuck), 0);
    const overdueTotal = n(overdueRow[0]?.v);
    const upcoming = dueSoon.filter((d) => !d.overdue).length;
    const idleFiveDaysInReview = stuck.filter((s) => s.column.toLowerCase().includes('review')).length;
    const takeaways = {
      throughput: completed === 0 ? 'No completed tasks in this range.' : `${plural(completed, 'task')} completed in this range${pctChange(completed, completedPrev) === null ? '' : `, ${pctChange(completed, completedPrev)! >= 0 ? 'up' : 'down'} ${Math.abs(pctChange(completed, completedPrev)!)}% on the previous period`}.`,
      burnup: `${plural(burn.created.at(-1) ?? 0, 'task')} created and ${plural(burn.completed.at(-1) ?? 0, 'task')} completed in this range.`,
      stuck: stuckTotal === 0 ? 'Nothing has been idle for more than 5 days.' : `${plural(stuckTotal, 'task')} ${stuckTotal === 1 ? 'has' : 'have'} not moved or been updated in more than 5 days${idleFiveDaysInReview && stuck.length === stuckTotal ? `, ${idleFiveDaysInReview} of them in Review` : ''}.`,
      workload: workload ? (workload.some((w) => w.highLoad) ? `${workload.filter((w) => w.highLoad).map((w) => w.name).join(', ')} ${workload.filter((w) => w.highLoad).length === 1 ? 'has' : 'have'} more than 1.5x the average open work.` : 'Open work is spread evenly across the team.') : null,
      due: overdueTotal === 0 && upcoming === 0 ? 'Nothing is due in the next 14 days.' : `${plural(overdueTotal, 'task')} overdue and ${upcoming >= 100 ? '100+ tasks' : plural(upcoming, 'task')} due in the next 14 days.`,
    };

    return {
      range,
      scope: { canMembers, project: project?.key ?? null, member: memberId },
      summary: {
        open: n(openRow[0]?.v),
        completed,
        completedPrev,
        completedChangePct: pctChange(completed, completedPrev),
        overdue: n(overdueRow[0]?.v),
        medianCycleDays: cycle,
        onTimeRate: onTimeTotal >= 5 ? Math.round((n(onTimeRow[0]?.ontime) / onTimeTotal) * 100) : null,
      },
      throughput: { daily: throughputDaily, weekly: toWeekly(throughputDaily) },
      burnup: burn,
      statusDistribution,
      workload,
      stuck,
      dueSoon,
      priorityMix,
      health,
      takeaways,
    };
  }

  /** Personal stats for the logged-in user, always available regardless of role. */
  async myStats(userId: string) {
    const today = todayUtc();
    const weekFrom = new Date(`${addDays(today, -6)}T00:00:00Z`);
    const monthFrom = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    const spark = new Date(`${addDays(today, -83)}T00:00:00Z`);
    const mine = Prisma.sql`EXISTS (SELECT 1 FROM pm_task_assignees ta WHERE ta.taskId = t.id AND ta.userId = ${userId}) AND t.archivedAt IS NULL`;
    const [week, month, open, overdue, weekly] = await Promise.all([
      this.prisma.$queryRaw<Array<{ v: bigint }>>`SELECT COUNT(*) AS v FROM pm_tasks t WHERE ${mine} AND t.completedAt >= ${weekFrom}`,
      this.prisma.$queryRaw<Array<{ v: bigint }>>`SELECT COUNT(*) AS v FROM pm_tasks t WHERE ${mine} AND t.completedAt >= ${monthFrom}`,
      this.prisma.$queryRaw<Array<{ v: bigint }>>`SELECT COUNT(*) AS v FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId WHERE ${mine} AND c.type <> 'done'`,
      this.prisma.$queryRaw<Array<{ v: bigint }>>`SELECT COUNT(*) AS v FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId WHERE ${mine} AND c.type <> 'done' AND t.dueDate < ${today}`,
      this.prisma.$queryRaw<Array<{ d: string; v: bigint }>>`
        SELECT DATE_FORMAT(t.completedAt, '%Y-%m-%d') AS d, COUNT(*) AS v FROM pm_tasks t
        WHERE ${mine} AND t.completedAt >= ${spark} GROUP BY d`,
    ]);
    const cycle = await this.medianCycleDays({ from: addDays(today, -89), to: today }, Prisma.sql`AND EXISTS (SELECT 1 FROM pm_task_assignees ta WHERE ta.taskId = t.id AND ta.userId = ${userId})`);
    const days = fillDays({ from: addDays(today, -83), to: today }, new Map(weekly.map((r) => [r.d, n(r.v)])));
    return {
      completedWeek: n(week[0]?.v),
      completedMonth: n(month[0]?.v),
      open: n(open[0]?.v),
      overdue: n(overdue[0]?.v),
      medianCycleDays: cycle,
      weekly: toWeekly(days).slice(-12),
    };
  }

  async activityFeed(q: { project?: string; member?: string; limit?: number }) {
    const project = q.project ? await this.prisma.pmProject.findUnique({ where: { key: q.project.toUpperCase() } }) : null;
    const items = await this.prisma.pmActivity.findMany({
      where: { ...(project ? { projectId: project.id } : {}), ...(q.member ? { actorId: q.member } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(q.limit ?? 50, 100),
    });
    const [users, tasks, projects] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: [...new Set(items.map((i) => i.actorId))] } }, select: { id: true, fullName: true } }),
      this.prisma.pmTask.findMany({ where: { id: { in: items.map((i) => i.taskId).filter((x): x is string => !!x) } }, select: { id: true, number: true, title: true, projectId: true } }),
      this.prisma.pmProject.findMany({ select: { id: true, key: true } }),
    ]);
    const names = new Map(users.map((u) => [u.id, u.fullName]));
    const keys = new Map(projects.map((p) => [p.id, p.key]));
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    return items.map((a) => {
      const t = a.taskId ? taskMap.get(a.taskId) : undefined;
      return { ...a, actorName: names.get(a.actorId) ?? 'Unknown', taskRef: t ? `${keys.get(t.projectId)}-${t.number}` : null, taskTitle: t?.title ?? null };
    });
  }

  /** CSV for a single report. Per-member data is admin-only. */
  async exportCsv(actor: PmActor, report: string, q: InsightsQueryDto): Promise<{ filename: string; body: string }> {
    const data = await this.insights(actor, q);
    const date = todayUtc();
    if (report === 'stuck') {
      return {
        filename: `insights-stuck-${date}.csv`,
        body: toCsv(['Task', 'Title', 'Project', 'Column', 'Assignee', 'Days idle'], data.stuck.map((s) => [s.ref, s.title, s.project, s.column, s.assignee ?? 'Unassigned', s.daysIdle])),
      };
    }
    if (report === 'health') {
      return {
        filename: `insights-health-${date}.csv`,
        body: toCsv(['Project', 'Key', 'Open', 'Done in range', 'Overdue', 'Stuck', 'Status'], data.health.map((h) => [h.name, h.key, h.open, h.doneInRange, h.overdue, h.stuck, h.status])),
      };
    }
    this.access.assert(actor, 'insights.members');
    return {
      filename: `insights-workload-${date}.csv`,
      body: toCsv(['Member', 'Open', 'Urgent', 'High', 'Medium', 'Low', 'High load'], (data.workload ?? []).map((w) => [w.name, w.open, w.urgent, w.high, w.medium, w.low, w.highLoad ? 'Yes' : ''])),
    };
  }
}
