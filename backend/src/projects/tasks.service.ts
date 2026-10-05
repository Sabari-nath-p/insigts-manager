import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PmColumn, PmPriority, PmTask, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PmAccessService } from './pm-access.service';
import { PmActivityService } from './pm-activity.service';
import { PmActor } from './pm-permissions';
import { addDays, todayUtc } from './pm-dates';
import { needsRebalance, positionBetween } from './pm-position';
import { ProjectsService } from './projects.service';
import { BoardQueryDto, CreateTaskDto, MoveTaskDto, PostUpdateDto, UpdateTaskDto } from './dto/pm.dto';

const OLD_DONE_DAYS = 14;
const TASK_REF_RE = /^([A-Za-z][A-Za-z0-9]{1,9})-(\d+)$/;

export interface PmTaskView {
  id: string;
  ref: string;
  projectId: string;
  projectKey: string;
  columnId: string;
  number: number;
  title: string;
  description: string | null;
  priority: PmPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  position: number;
  createdBy: string;
  completedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  labelIds: string[];
  updateCount: number;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PmAccessService,
    private readonly activity: PmActivityService,
    private readonly projects: ProjectsService,
  ) {}

  // --- Reads -------------------------------------------------------------

  /** Shapes raw task rows with assignee names, label ids and update counts in three batched queries. */
  async hydrate(tasks: PmTask[], projectKeys?: Map<string, string>): Promise<PmTaskView[]> {
    if (tasks.length === 0) return [];
    const ids = tasks.map((t) => t.id);
    const assigneeIds = [...new Set(tasks.map((t) => t.assigneeId).filter((x): x is string => !!x))];
    const projectIds = [...new Set(tasks.map((t) => t.projectId))];
    const [users, labels, counts, projs] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, fullName: true } }),
      this.prisma.pmTaskLabel.findMany({ where: { taskId: { in: ids } } }),
      this.prisma.pmUpdate.groupBy({ by: ['taskId'], where: { taskId: { in: ids } }, _count: { _all: true } }),
      projectKeys
        ? Promise.resolve([])
        : this.prisma.pmProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, key: true } }),
    ]);
    const names = new Map(users.map((u) => [u.id, u.fullName]));
    const keys = projectKeys ?? new Map(projs.map((p) => [p.id, p.key]));
    const labelMap = new Map<string, string[]>();
    for (const l of labels) labelMap.set(l.taskId, [...(labelMap.get(l.taskId) ?? []), l.labelId]);
    const countMap = new Map(counts.map((c) => [c.taskId, c._count._all]));
    return tasks.map((t) => ({
      id: t.id,
      ref: `${keys.get(t.projectId)}-${t.number}`,
      projectId: t.projectId,
      projectKey: keys.get(t.projectId) ?? '',
      columnId: t.columnId,
      number: t.number,
      title: t.title,
      description: t.description,
      priority: t.priority,
      assigneeId: t.assigneeId,
      assigneeName: t.assigneeId ? (names.get(t.assigneeId) ?? null) : null,
      dueDate: t.dueDate,
      position: t.position,
      createdBy: t.createdBy,
      completedAt: t.completedAt,
      archivedAt: t.archivedAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      labelIds: labelMap.get(t.id) ?? [],
      updateCount: countMap.get(t.id) ?? 0,
    }));
  }

  /** One server query for the whole board: project, columns, labels, filtered tasks, member list. */
  async board(userId: string, key: string, q: BoardQueryDto, showOlderDone = false) {
    const project = await this.projects.getByKey(key);
    const today = todayUtc();
    const columns = await this.prisma.pmColumn.findMany({ where: { projectId: project.id }, orderBy: { position: 'asc' } });
    const doneIds = columns.filter((c) => c.type === 'done').map((c) => c.id);

    const and: Prisma.PmTaskWhereInput[] = [{ projectId: project.id, archivedAt: null }];
    if (q.assignee === 'me') and.push({ assigneeId: userId });
    else if (q.assignee === 'none') and.push({ assigneeId: null });
    else if (q.assignee) and.push({ assigneeId: q.assignee });
    if (q.priority) and.push({ priority: q.priority });
    if (q.label) and.push({ id: { in: (await this.prisma.pmTaskLabel.findMany({ where: { labelId: q.label } })).map((l) => l.taskId) } });
    if (q.due === 'overdue') and.push({ dueDate: { lt: today }, columnId: { notIn: doneIds } });
    if (q.due === 'week') and.push({ dueDate: { gte: today, lte: addDays(today, 7) } });
    if (q.q?.trim()) {
      const text = q.q.trim();
      const numberMatch = text.match(/(\d+)$/);
      and.push({ OR: [{ title: { contains: text } }, ...(numberMatch ? [{ number: Number(numberMatch[1]) }] : [])] });
    }

    const where: Prisma.PmTaskWhereInput = { AND: and };
    const cutoff = new Date(Date.now() - OLD_DONE_DAYS * 86_400_000);
    const oldDone: Prisma.PmTaskWhereInput = { columnId: { in: doneIds }, completedAt: { lt: cutoff } };

    const [rows, olderDone, labels, members] = await Promise.all([
      this.prisma.pmTask.findMany({
        where: showOlderDone ? where : { AND: [where, { NOT: oldDone }] },
        orderBy: [{ position: 'asc' }],
      }),
      this.prisma.pmTask.count({ where: { AND: [where, oldDone] } }),
      this.prisma.pmLabel.findMany({ where: { projectId: project.id }, orderBy: { name: 'asc' } }),
      this.members(),
    ]);
    const tasks = await this.hydrate(rows, new Map([[project.id, project.key]]));
    return { project, columns, labels, tasks, olderDone, members };
  }

  /** Every active user, for assignee pickers and the team page. Existing users table, read-only. */
  members() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, email: true, role: true, designation: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async findTask(ref: string): Promise<PmTask & { projectKey: string }> {
    const m = ref.match(TASK_REF_RE);
    let task: PmTask | null;
    let projectKey: string;
    if (m) {
      const project = await this.projects.getByKey(m[1]);
      projectKey = project.key;
      task = await this.prisma.pmTask.findUnique({ where: { projectId_number: { projectId: project.id, number: Number(m[2]) } } });
    } else {
      task = await this.prisma.pmTask.findUnique({ where: { id: ref } });
      const p = task ? await this.prisma.pmProject.findUnique({ where: { id: task.projectId } }) : null;
      projectKey = p?.key ?? '';
    }
    if (!task) throw new NotFoundException('Task not found');
    return { ...task, projectKey };
  }

  async detail(ref: string) {
    const task = await this.findTask(ref);
    const [view] = await this.hydrate([task], new Map([[task.projectId, task.projectKey]]));
    const [updates, activity] = await Promise.all([
      this.prisma.pmUpdate.findMany({ where: { taskId: task.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.pmActivity.findMany({ where: { taskId: task.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    const names = await this.userNames([...updates.map((u) => u.authorId), ...activity.map((a) => a.actorId)]);
    return {
      task: view,
      updates: updates.map((u) => ({ ...u, authorName: names.get(u.authorId) ?? 'Unknown' })),
      activity: activity.map((a) => ({ ...a, actorName: names.get(a.actorId) ?? 'Unknown' })),
    };
  }

  async userNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    const users = await this.prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, fullName: true } });
    return new Map(users.map((u) => [u.id, u.fullName]));
  }

  // --- Writes ------------------------------------------------------------

  private async assertAssignable(assigneeId?: string | null) {
    if (!assigneeId) return;
    const user = await this.prisma.user.findUnique({ where: { id: assigneeId }, select: { isActive: true } });
    if (!user?.isActive) throw new BadRequestException('That person cannot be assigned tasks');
  }

  async create(actor: PmActor, key: string, dto: CreateTaskDto): Promise<PmTaskView> {
    this.access.assert(actor, 'task.create');
    const project = await this.projects.getByKey(key);
    if (project.status === 'archived') throw new BadRequestException('This project is archived');
    await this.assertAssignable(dto.assigneeId);

    const column: PmColumn | null = dto.columnId
      ? await this.prisma.pmColumn.findFirst({ where: { id: dto.columnId, projectId: project.id } })
      : await this.prisma.pmColumn.findFirst({ where: { projectId: project.id }, orderBy: { position: 'asc' } });
    if (!column) throw new BadRequestException('Unknown column');

    const task = await this.prisma.$transaction(async (tx) => {
      const bumped = await tx.pmProject.update({ where: { id: project.id }, data: { nextTaskNumber: { increment: 1 } } });
      const last = await tx.pmTask.findFirst({ where: { columnId: column.id }, orderBy: { position: 'desc' } });
      const now = new Date();
      const created = await tx.pmTask.create({
        data: {
          projectId: project.id,
          columnId: column.id,
          number: bumped.nextTaskNumber - 1,
          title: dto.title.trim(),
          description: dto.description,
          priority: dto.priority ?? 'medium',
          assigneeId: dto.assigneeId ?? null,
          dueDate: dto.dueDate ?? null,
          position: positionBetween(last?.position ?? null, null),
          createdBy: actor.userId,
          startedAt: column.type === 'todo' ? null : now,
          completedAt: column.type === 'done' ? now : null,
        },
      });
      if (dto.labelIds?.length) {
        const valid = await tx.pmLabel.findMany({ where: { id: { in: dto.labelIds }, projectId: project.id } });
        await tx.pmTaskLabel.createMany({ data: valid.map((l) => ({ taskId: created.id, labelId: l.id })) });
      }
      await this.activity.log(tx, { projectId: project.id, taskId: created.id, actorId: actor.userId, type: 'task.created' });
      if (created.assigneeId) {
        await this.activity.log(tx, {
          projectId: project.id,
          taskId: created.id,
          actorId: actor.userId,
          type: 'task.assigned',
          meta: { from: null, to: created.assigneeId },
        });
        await this.activity.notify(tx, [created.assigneeId], { type: 'task.assigned', taskId: created.id, actorId: actor.userId });
      }
      return created;
    });
    return (await this.hydrate([task], new Map([[project.id, project.key]])))[0];
  }

  async update(actor: PmActor, ref: string, dto: UpdateTaskDto): Promise<PmTaskView> {
    this.access.assert(actor, 'task.edit');
    const task = await this.findTask(ref);
    if (dto.assigneeId) await this.assertAssignable(dto.assigneeId);

    const data: Prisma.PmTaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;
    if (dto.dueDate !== undefined) {
      if (dto.dueDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dto.dueDate)) throw new BadRequestException('Invalid date');
      data.dueDate = dto.dueDate;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.pmTask.update({ where: { id: task.id }, data });
      const base = { projectId: task.projectId, taskId: task.id, actorId: actor.userId };
      if (dto.priority !== undefined && dto.priority !== task.priority) {
        await this.activity.log(tx, { ...base, type: 'priority.changed', meta: { from: task.priority, to: dto.priority } });
      }
      if (dto.dueDate !== undefined && dto.dueDate !== task.dueDate) {
        await this.activity.log(tx, { ...base, type: 'due.changed', meta: { from: task.dueDate, to: dto.dueDate } });
      }
      if (dto.assigneeId !== undefined && dto.assigneeId !== task.assigneeId) {
        await this.activity.log(tx, { ...base, type: 'task.assigned', meta: { from: task.assigneeId, to: dto.assigneeId } });
        await this.activity.notify(tx, [dto.assigneeId], { type: 'task.assigned', taskId: task.id, actorId: actor.userId });
      }
      if (dto.labelIds) {
        const valid = await tx.pmLabel.findMany({ where: { id: { in: dto.labelIds }, projectId: task.projectId } });
        await tx.pmTaskLabel.deleteMany({ where: { taskId: task.id } });
        await tx.pmTaskLabel.createMany({ data: valid.map((l) => ({ taskId: task.id, labelId: l.id })) });
      }
    });
    const fresh = await this.prisma.pmTask.findUniqueOrThrow({ where: { id: task.id } });
    return (await this.hydrate([fresh], new Map([[task.projectId, task.projectKey]])))[0];
  }

  /** Moves a task to a column and slot. Sets/clears completedAt around `done` columns and logs activity. */
  async move(actor: PmActor, ref: string, dto: MoveTaskDto): Promise<PmTaskView> {
    this.access.assert(actor, 'task.edit');
    const task = await this.findTask(ref);
    const target = await this.prisma.pmColumn.findFirst({ where: { id: dto.columnId, projectId: task.projectId } });
    if (!target) throw new BadRequestException('Unknown column');
    const source = await this.prisma.pmColumn.findUniqueOrThrow({ where: { id: task.columnId } });

    await this.prisma.$transaction(async (tx) => {
      const siblings = await tx.pmTask.findMany({
        where: { columnId: target.id, archivedAt: null, id: { not: task.id } },
        orderBy: { position: 'asc' },
        select: { id: true, position: true },
      });
      const idx = dto.afterTaskId ? siblings.findIndex((s) => s.id === dto.afterTaskId) : -1;
      if (dto.afterTaskId && idx === -1) throw new BadRequestException('Unknown neighbouring task');
      let before = siblings[idx]?.position ?? null;
      let after = siblings[idx + 1]?.position ?? null;
      if (before !== null && after !== null && needsRebalance(before, after)) {
        // Neighbours collapsed together: renumber the column once, then recompute the gap.
        for (let i = 0; i < siblings.length; i++) {
          await tx.pmTask.update({ where: { id: siblings[i].id }, data: { position: (i + 1) * 1000 } });
        }
        before = (idx + 1) * 1000;
        after = (idx + 2) * 1000;
      }
      const now = new Date();
      const enteringDone = target.type === 'done' && source.type !== 'done';
      const leavingDone = target.type !== 'done' && source.type === 'done';
      await tx.pmTask.update({
        where: { id: task.id },
        data: {
          columnId: target.id,
          position: positionBetween(before, after),
          completedAt: enteringDone ? now : leavingDone ? null : undefined,
          startedAt: task.startedAt ?? (target.type !== 'todo' ? now : undefined),
        },
      });
      if (target.id !== source.id) {
        const base = { projectId: task.projectId, taskId: task.id, actorId: actor.userId };
        await this.activity.log(tx, { ...base, type: 'task.moved', meta: { from: source.name, to: target.name } });
        if (enteringDone) {
          await this.activity.log(tx, { ...base, type: 'task.completed' });
          await this.activity.notify(tx, [task.createdBy], { type: 'task.completed', taskId: task.id, actorId: actor.userId });
        }
      }
    });
    const fresh = await this.prisma.pmTask.findUniqueOrThrow({ where: { id: task.id } });
    return (await this.hydrate([fresh], new Map([[task.projectId, task.projectKey]])))[0];
  }

  async setArchived(actor: PmActor, ref: string, archived: boolean) {
    this.access.assert(actor, 'task.edit');
    const task = await this.findTask(ref);
    await this.prisma.pmTask.update({ where: { id: task.id }, data: { archivedAt: archived ? new Date() : null } });
    return { ok: true };
  }

  async remove(actor: PmActor, ref: string) {
    const task = await this.findTask(ref);
    this.access.assert(actor, 'task.delete', { createdBy: task.createdBy });
    await this.prisma.$transaction([
      this.prisma.pmTaskLabel.deleteMany({ where: { taskId: task.id } }),
      this.prisma.pmUpdate.deleteMany({ where: { taskId: task.id } }),
      this.prisma.pmNotification.deleteMany({ where: { taskId: task.id } }),
      this.prisma.pmActivity.deleteMany({ where: { taskId: task.id } }),
      this.prisma.pmTask.delete({ where: { id: task.id } }),
    ]);
    return { ok: true };
  }

  async postUpdate(actor: PmActor, ref: string, dto: PostUpdateDto) {
    this.access.assert(actor, 'task.edit');
    const task = await this.findTask(ref);
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('Write something first');
    const update = await this.prisma.$transaction(async (tx) => {
      const u = await tx.pmUpdate.create({ data: { taskId: task.id, authorId: actor.userId, body } });
      await this.activity.log(tx, { projectId: task.projectId, taskId: task.id, actorId: actor.userId, type: 'update.posted' });
      await this.activity.notify(tx, [task.assigneeId, task.createdBy], { type: 'update.posted', taskId: task.id, actorId: actor.userId });
      return u;
    });
    const names = await this.userNames([actor.userId]);
    return { ...update, authorName: names.get(actor.userId) ?? 'Unknown' };
  }

  // --- My Work -----------------------------------------------------------

  /** Open tasks assigned to the user across projects, bucketed by due date. */
  async myWork(userId: string) {
    const rows = await this.prisma.$queryRaw<PmTask[]>`
      SELECT t.* FROM pm_tasks t
      JOIN pm_columns c ON c.id = t.columnId
      JOIN pm_projects p ON p.id = t.projectId
      WHERE t.assigneeId = ${userId} AND t.archivedAt IS NULL AND c.type <> 'done' AND p.status = 'active'
      ORDER BY (t.dueDate IS NULL), t.dueDate ASC, t.updatedAt DESC
      LIMIT 500`;
    const tasks = await this.hydrate(rows);
    const columns = await this.prisma.pmColumn.findMany({ where: { projectId: { in: [...new Set(tasks.map((t) => t.projectId))] } }, orderBy: { position: 'asc' } });
    const today = todayUtc();
    const weekEnd = addDays(today, 7);
    const groups = { overdue: [] as PmTaskView[], today: [] as PmTaskView[], week: [] as PmTaskView[], later: [] as PmTaskView[], none: [] as PmTaskView[] };
    for (const t of tasks) {
      if (!t.dueDate) groups.none.push(t);
      else if (t.dueDate < today) groups.overdue.push(t);
      else if (t.dueDate === today) groups.today.push(t);
      else if (t.dueDate <= weekEnd) groups.week.push(t);
      else groups.later.push(t);
    }
    return { groups, columns };
  }

  // --- Notifications -----------------------------------------------------

  async notifications(userId: string) {
    const [items, unread] = await Promise.all([
      this.prisma.pmNotification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.pmNotification.count({ where: { userId, readAt: null } }),
    ]);
    const taskIds = [...new Set(items.map((n) => n.taskId).filter((x): x is string => !!x))];
    const tasks = await this.prisma.pmTask.findMany({ where: { id: { in: taskIds } } });
    const views = new Map((await this.hydrate(tasks)).map((t) => [t.id, t]));
    const names = await this.userNames(items.map((n) => n.actorId).filter((x): x is string => !!x));
    return {
      unread,
      items: items.map((n) => ({
        ...n,
        actorName: n.actorId ? (names.get(n.actorId) ?? null) : null,
        taskRef: n.taskId ? (views.get(n.taskId)?.ref ?? null) : null,
        taskTitle: n.taskId ? (views.get(n.taskId)?.title ?? null) : null,
      })),
    };
  }

  async markRead(userId: string, id?: string) {
    await this.prisma.pmNotification.updateMany({
      where: { userId, readAt: null, ...(id ? { id } : {}) },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  // --- Daily due-soon job ------------------------------------------------

  /** Notifies assignees of open tasks due tomorrow. Idempotent per task per day. */
  async notifyDueSoon(): Promise<number> {
    const tomorrow = addDays(todayUtc(), 1);
    const dayStart = new Date(`${todayUtc()}T00:00:00Z`);
    const due = await this.prisma.$queryRaw<Array<{ id: string; assigneeId: string }>>`
      SELECT t.id, t.assigneeId FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId
      WHERE t.dueDate = ${tomorrow} AND t.assigneeId IS NOT NULL AND t.archivedAt IS NULL AND c.type <> 'done'`;
    let sent = 0;
    for (const t of due) {
      const already = await this.prisma.pmNotification.count({
        where: { userId: t.assigneeId, taskId: t.id, type: 'task.due_soon', createdAt: { gte: dayStart } },
      });
      if (already) continue;
      await this.prisma.pmNotification.create({ data: { userId: t.assigneeId, taskId: t.id, type: 'task.due_soon' } });
      sent++;
    }
    return sent;
  }
}
