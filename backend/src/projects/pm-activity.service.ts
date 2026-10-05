import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

/** Activity + notification writes. Called by the same code path that makes each change. */
@Injectable()
export class PmActivityService {
  log(
    db: PmDb,
    e: { projectId: string; taskId?: string | null; actorId: string; type: PmActivityType; meta?: Prisma.InputJsonValue },
  ) {
    return db.pmActivity.create({
      data: { projectId: e.projectId, taskId: e.taskId ?? null, actorId: e.actorId, type: e.type, meta: e.meta ?? Prisma.JsonNull },
    });
  }

  /** Notifies each distinct recipient except the actor themselves. */
  async notify(db: PmDb, recipients: Array<string | null | undefined>, n: { type: string; taskId: string; actorId: string }) {
    const unique = [...new Set(recipients.filter((r): r is string => !!r && r !== n.actorId))];
    if (unique.length === 0) return;
    await db.pmNotification.createMany({
      data: unique.map((userId) => ({ userId, type: n.type, taskId: n.taskId, actorId: n.actorId })),
    });
  }
}
