import { createHash } from 'crypto';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body?: string;
  /** Path to open when the notification is clicked. */
  url?: string;
  /** Same tag replaces an earlier notification instead of stacking. */
  tag?: string;
}

export const endpointHash = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex');

/**
 * Web Push (free, standards-based, no third-party account). Delivery goes through the browser
 * vendor's push service using VAPID keys from the environment. With no keys configured the
 * service stays disabled and everything else keeps working (in-app notifications only).
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;
  publicKey: string | null = null;
  /** Options for each send. Exposed so tests can point it at a local stand-in for the push service. */
  sendOptions: webpush.RequestOptions = { TTL: 3600 };

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const pub = this.config.get<string>('VAPID_PUBLIC_KEY');
    const priv = this.config.get<string>('VAPID_PRIVATE_KEY');
    if (!pub || !priv) {
      this.logger.warn('VAPID keys not set: browser push is disabled (in-app notifications still work)');
      return;
    }
    webpush.setVapidDetails(this.config.get<string>('VAPID_SUBJECT') || 'mailto:admin@insights.local', pub, priv);
    this.publicKey = pub;
    this.enabled = true;
  }

  async subscribe(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string) {
    const hash = endpointHash(sub.endpoint);
    await this.prisma.pushSubscription.upsert({
      where: { endpointHash: hash },
      create: { userId, endpointHash: hash, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent?.slice(0, 300) },
      // A device re-subscribing after someone else logged in on it now belongs to the new user.
      update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpointHash: endpointHash(endpoint) } });
  }

  /** Sends to every device of the given users. Never throws; dead subscriptions are removed. */
  async send(userIds: string[], payload: PushPayload): Promise<number> {
    if (!this.enabled || userIds.length === 0) return 0;
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
    const body = JSON.stringify(payload);
    let delivered = 0;
    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, this.sendOptions);
          delivered++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await this.prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
          else this.logger.warn(`Push failed (${status ?? 'network'})`);
        }
      }),
    );
    return delivered;
  }
}
