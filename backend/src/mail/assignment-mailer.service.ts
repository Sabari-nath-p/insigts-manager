import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignedTask, buildAssignmentEmail } from './assignment-email';
import { MailService } from './mail.service';

/** Assignments to the same person within this long are sent as one email, so a bulk assign is not a flood. */
export const MAIL_BATCH_MS = 60_000;

interface Pending {
  taskIds: Set<string>;
  actorIds: Set<string>;
  timer: NodeJS.Timeout;
}

/**
 * Emails people who were given a task. `queue` is called after an assignment is saved; it only notes it down and
 * returns at once. A minute later each person gets one email covering everything assigned to them in that time.
 * Anything that goes wrong is logged and dropped: assigning a task never waits for, or fails because of, an email.
 * A restart of the server forgets assignments still waiting in that minute.
 */
@Injectable()
export class AssignmentMailer implements OnModuleDestroy {
  private readonly logger = new Logger(AssignmentMailer.name);
  private readonly pending = new Map<string, Pending>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Notes that these people were assigned this task. Never throws. Nobody is emailed about assigning themselves. */
  queue(userIds: string[], taskId: string, actorId: string): void {
    if (!this.mail.enabled) return;
    for (const userId of new Set(userIds)) {
      if (userId === actorId) continue;
      let entry = this.pending.get(userId);
      if (!entry) {
        const timer = setTimeout(() => void this.flush(userId), MAIL_BATCH_MS);
        timer.unref(); // a waiting email never keeps the server from shutting down
        entry = { taskIds: new Set(), actorIds: new Set(), timer };
        this.pending.set(userId, entry);
      }
      entry.taskIds.add(taskId);
      entry.actorIds.add(actorId);
    }
  }

  onModuleDestroy() {
    for (const entry of this.pending.values()) clearTimeout(entry.timer);
    this.pending.clear();
  }

  private async flush(userId: string): Promise<void> {
    const entry = this.pending.get(userId);
    this.pending.delete(userId);
    if (!entry) return;
    try {
      const taskIds = [...entry.taskIds];
      const [people, stillAssigned, tasks] = await Promise.all([
        this.prisma.user.findMany({ where: { id: { in: [userId, ...entry.actorIds] } }, select: { id: true, fullName: true, email: true, isActive: true } }),
        this.prisma.pmTaskAssignee.findMany({ where: { userId, taskId: { in: taskIds } }, select: { taskId: true } }),
        this.prisma.pmTask.findMany({ where: { id: { in: taskIds } }, select: { id: true, number: true, title: true, projectId: true } }),
      ]);
      const recipient = people.find((p) => p.id === userId);
      if (!recipient || !recipient.isActive || !recipient.email) return;

      // Only tasks the person is still on (they may have been taken off again within the minute).
      const keep = new Set(stillAssigned.map((a) => a.taskId));
      const live = tasks.filter((t) => keep.has(t.id)).sort((a, b) => a.number - b.number);
      if (live.length === 0) return;

      const projects = await this.prisma.pmProject.findMany({ where: { id: { in: [...new Set(live.map((t) => t.projectId))] } }, select: { id: true, key: true, name: true } });
      const byProject = new Map(projects.map((p) => [p.id, p]));
      const assigned: AssignedTask[] = live.flatMap((t) => {
        const project = byProject.get(t.projectId);
        return project ? [{ ref: `${project.key}-${t.number}`, title: t.title, projectKey: project.key, projectName: project.name }] : [];
      });
      if (assigned.length === 0) return;

      const email = buildAssignmentEmail({
        recipientName: recipient.fullName,
        actorNames: people.filter((p) => entry.actorIds.has(p.id)).map((p) => p.fullName),
        tasks: assigned,
        appUrl: this.mail.appUrl,
      });
      await this.mail.send({ to: recipient.email, ...email });
    } catch (e) {
      this.logger.warn(`Assignment email dropped: ${(e as Error).message}`);
    }
  }
}
