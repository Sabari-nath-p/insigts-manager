import { Injectable, Logger } from '@nestjs/common';
import { PresenceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PRESENCE_TEXT, presenceEvent } from './presence-events';
import { PushPayload, PushService } from './push.service';

export interface NewNotification {
  type: string;
  title: string;
  body?: string;
  link?: string;
  actorId?: string;
}

/** Same person repeating the same action inside this window is announced once. */
const DEDUPE_MS = 60_000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  /** Stores an in-app notification for each user and pushes it to their devices. */
  async notifyUsers(userIds: string[], n: NewNotification): Promise<void> {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return;
    await this.prisma.appNotification.createMany({
      data: ids.map((userId) => ({ userId, type: n.type, title: n.title, body: n.body, link: n.link, actorId: n.actorId })),
    });
    await this.push.send(ids, { title: n.title, body: n.body, url: n.link, tag: n.type });
  }

  /** Push only, for alerts that are already stored elsewhere (the Projects bell). */
  pushOnly(userIds: string[], payload: PushPayload): Promise<number> {
    return this.push.send([...new Set(userIds)], payload);
  }

  /**
   * Called whenever someone's presence status is saved. Announces started / paused / resumed to
   * every other active employee. Fire-and-forget: a notification problem must never fail the
   * check-in or break the person actually pressed.
   */
  presenceChanged(userId: string, prev: PresenceStatus | null | undefined, next: PresenceStatus): void {
    this.announcePresence(userId, prev, next).catch((e) => this.logger.warn(`Presence notification failed: ${(e as Error).message}`));
  }

  private async announcePresence(userId: string, prev: PresenceStatus | null | undefined, next: PresenceStatus) {
    const event = presenceEvent(prev, next);
    if (!event) return;
    const type = `presence.${event}`;
    const recent = await this.prisma.appNotification.count({
      where: { actorId: userId, type, createdAt: { gt: new Date(Date.now() - DEDUPE_MS) } },
    });
    if (recent > 0) return;
    const [actor, others] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
      this.prisma.user.findMany({ where: { isActive: true, id: { not: userId } }, select: { id: true } }),
    ]);
    if (!actor) return;
    await this.notifyUsers(
      others.map((u) => u.id),
      { type, title: PRESENCE_TEXT[event](actor.fullName), link: '/status', actorId: userId },
    );
  }

  async list(userId: string) {
    const [items, unread] = await Promise.all([
      this.prisma.appNotification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
      this.prisma.appNotification.count({ where: { userId, readAt: null } }),
    ]);
    return { unread, items };
  }

  async markRead(userId: string, id?: string) {
    await this.prisma.appNotification.updateMany({ where: { userId, readAt: null, ...(id ? { id } : {}) }, data: { readAt: new Date() } });
    return { ok: true };
  }

  /** Keeps the table small: read items after 30 days, anything after 90. */
  async prune(): Promise<void> {
    const day = 86_400_000;
    await this.prisma.appNotification.deleteMany({
      where: { OR: [{ readAt: { not: null }, createdAt: { lt: new Date(Date.now() - 30 * day) } }, { createdAt: { lt: new Date(Date.now() - 90 * day) } }] },
    });
  }
}
