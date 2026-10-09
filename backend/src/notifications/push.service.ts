import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type ServiceAccount, cert, getApps, initializeApp } from 'firebase-admin/app';
import { type Messaging, getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body?: string;
  /** Path to open when the notification is clicked. */
  url?: string;
  /** Same tag replaces an earlier notification instead of stacking. */
  tag?: string;
}

/** The public half of the Firebase web app settings. These are meant to be shipped to browsers. */
export interface FirebaseWebConfig {
  apiKey: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

/** Firebase Cloud Messaging allows at most 500 tokens per multicast request. */
const FCM_BATCH = 500;

/** Error codes meaning the device is gone for good, so its token should be forgotten. */
const DEAD_TOKEN_CODES = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);

/**
 * Browser alerts through Firebase Cloud Messaging (free). The backend signs in with a Firebase
 * service account; browsers get their tokens with the public web config served by /notifications/config.
 * With no Firebase settings the service stays disabled and everything else keeps working
 * (in-app notifications only).
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private messaging: Messaging | null = null;
  webConfig: FirebaseWebConfig | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const web = this.readWebConfig();
    const credential = this.readServiceAccount();
    if (!web || !credential) {
      this.logger.warn('Firebase settings incomplete: browser push is disabled (in-app notifications still work)');
      return;
    }
    try {
      const app = getApps()[0] ?? initializeApp({ credential: cert(credential) });
      this.messaging = getMessaging(app);
      this.webConfig = web;
    } catch (e) {
      this.logger.error(`Firebase could not start, browser push is disabled: ${(e as Error).message}`);
    }
  }

  private readWebConfig(): FirebaseWebConfig | null {
    const c = {
      apiKey: this.config.get<string>('FIREBASE_WEB_API_KEY'),
      projectId: this.config.get<string>('FIREBASE_PROJECT_ID'),
      messagingSenderId: this.config.get<string>('FIREBASE_MESSAGING_SENDER_ID'),
      appId: this.config.get<string>('FIREBASE_APP_ID'),
      vapidKey: this.config.get<string>('FIREBASE_VAPID_KEY'),
    };
    return Object.values(c).every(Boolean) ? (c as FirebaseWebConfig) : null;
  }

  /** The service account key, either inline as JSON (FIREBASE_SERVICE_ACCOUNT_JSON) or as a file path. */
  private readServiceAccount(): ServiceAccount | null {
    try {
      const inline = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
      if (inline) return JSON.parse(inline);
      const file = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_FILE');
      if (file) return JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      this.logger.error(`Firebase service account could not be read: ${(e as Error).message}`);
    }
    return null;
  }

  async subscribe(userId: string, token: string, userAgent?: string) {
    const hash = tokenHash(token);
    await this.prisma.fcmToken.upsert({
      where: { tokenHash: hash },
      create: { userId, tokenHash: hash, token, userAgent: userAgent?.slice(0, 300) },
      // A browser that now belongs to someone else (shared computer) follows the new user.
      update: { userId },
    });
  }

  async unsubscribe(userId: string, token: string) {
    await this.prisma.fcmToken.deleteMany({ where: { userId, tokenHash: tokenHash(token) } });
  }

  /** Sends to every device of the given users. Never throws; dead tokens are removed. */
  async send(userIds: string[], payload: PushPayload): Promise<number> {
    if (!this.messaging || userIds.length === 0) return 0;
    const rows = await this.prisma.fcmToken.findMany({ where: { userId: { in: userIds } }, select: { token: true } });
    // Data-only messages: the service worker decides how to show them, so click handling stays ours.
    const data: Record<string, string> = { title: payload.title };
    if (payload.body) data.body = payload.body;
    if (payload.url) data.url = payload.url;
    if (payload.tag) data.tag = payload.tag;

    let delivered = 0;
    for (let i = 0; i < rows.length; i += FCM_BATCH) {
      const tokens = rows.slice(i, i + FCM_BATCH).map((r) => r.token);
      try {
        const res = await this.messaging.sendEachForMulticast({
          tokens,
          data,
          webpush: { headers: { TTL: '3600', Urgency: 'high' } },
        });
        delivered += res.successCount;
        const dead = res.responses.flatMap((r, idx) => (!r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code) ? [tokens[idx]] : []));
        if (dead.length) await this.prisma.fcmToken.deleteMany({ where: { tokenHash: { in: dead.map(tokenHash) } } });
      } catch (e) {
        this.logger.warn(`Firebase send failed: ${(e as Error).message}`);
      }
    }
    return delivered;
  }
}
