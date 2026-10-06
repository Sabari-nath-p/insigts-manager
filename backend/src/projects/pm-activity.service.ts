import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

export type PmActivityType =
  | 'task.created'
  | 'task.moved'
  | 'task.assigned'
  | 'task.completed'
  | 'update.posted'
  | 'due.changed'
  | 'priority.changed';

export type PmDb = PrismaService | Prisma.TransactionClient;

/** Headline for each notification type, shown in the browser alert. */
const PUSH_TEXT: Record<string, (actor: string, ref: string) => string> = {
  'task.assigned': (a, ref) => `${a} assigned you ${ref}`,
  'update.posted': (a, ref) => `${a} posted an update on ${ref}`,
  'task.completed': (a, ref) => `${a} completed ${ref}`,
  'task.due_today': (_a, ref) => `${ref} is due today`,
  'task.due_soon': (_a, ref) => `${ref} is due tomorrow`,
};

/** Activity + notification writes. Called by the same code path that makes each change. */
@Injectable()
export class PmActivityService {
  private readonly logger = new Logger(PmActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  log(
    db: PmDb,
    e: { projectId: string; taskId?: string | null; actorId: string; type: PmActivityType; meta?: Prisma.InputJsonValue },
  ) {
    return db.pmActivity.create({
      data: { projectId: e.projectId, taskId: e.taskId ?? null, actorId: e.actorId, type: e.type, meta: e.meta ?? Prisma.JsonNull },
    });
  }

  /** Notifies each distinct recipient except the actor themselves, in the Projects bell and as a push. */
  async notify(db: PmDb, recipients: Array<string | null | undefined>, n: { type: string; taskId: string; actorId: string }) {
    const unique = [...new Set(recipients.filter((r): r is string => !!r && r !== n.actorId))];
    if (unique.length === 0) return;
    await db.pmNotification.createMany({
      data: unique.map((userId) => ({ userId, type: n.type, taskId: n.taskId, actorId: n.actorId })),
    });
    this.push(unique, n.type, n.taskId, n.actorId);
  }

  /** Browser push for a Projects alert. Fire-and-forget: a push problem must never fail the task action. */
  push(userIds: string[], type: string, taskId: string, actorId: string | null): void {
    this.sendPush(userIds, type, taskId, actorId).catch((e) => this.logger.warn(`Push failed: ${(e as Error).message}`));
  }

  private async sendPush(userIds: string[], type: string, taskId: string, actorId: string | null) {
    const text = PUSH_TEXT[type];
    if (!text) return;
    const task = await this.prisma.pmTask.findUnique({ where: { id: taskId }, select: { number: true, title: true, projectId: true } });
    if (!task) return;
    const [project, actor] = await Promise.all([
      this.prisma.pmProject.findUnique({ where: { id: task.projectId }, select: { key: true } }),
      actorId ? this.prisma.user.findUnique({ where: { id: actorId }, select: { fullName: true } }) : null,
    ]);
    if (!project) return;
    const ref = `${project.key}-${task.number}`;
    await this.notifications.pushOnly(userIds, {
      title: text(actor?.fullName ?? 'Someone', ref),
      body: task.title,
      url: `/projects/${project.key}?task=${ref}`,
      tag: `${type}:${taskId}`,
    });
  }
}
