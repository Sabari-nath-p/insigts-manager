/**
 * PushService with Firebase replaced by a stand-in, so no Google account or network is needed.
 * The cases that store tokens need a migrated MySQL database:
 *   PM_TEST_DATABASE_URL=mysql://... npx jest push.integration
 * Those are skipped when the variable is absent. They only touch their own fcm_tokens rows.
 */
import { PrismaClient } from '@prisma/client';
import { PushService, tokenHash } from './push.service';

const sendEachForMulticast = jest.fn();
jest.mock('firebase-admin/app', () => ({
  cert: (c: unknown) => c,
  getApps: () => [],
  initializeApp: () => ({}),
}));
jest.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({ sendEachForMulticast }),
}));

const SETTINGS: Record<string, string> = {
  FIREBASE_WEB_API_KEY: 'key',
  FIREBASE_PROJECT_ID: 'proj',
  FIREBASE_MESSAGING_SENDER_ID: '123',
  FIREBASE_APP_ID: '1:123:web:abc',
  FIREBASE_VAPID_KEY: 'vapid',
  FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'proj', client_email: 'a@b.c', private_key: 'x' }),
};

const build = (prisma: unknown, settings: Record<string, string> = SETTINGS) => {
  const service = new PushService(prisma as never, { get: (k: string) => settings[k] } as never);
  service.onModuleInit();
  return service;
};

describe('PushService without Firebase settings', () => {
  it('stays disabled, sends nothing and does not throw', async () => {
    const service = build({}, {});
    expect(service.webConfig).toBeNull();
    expect(await service.send(['u'], { title: 'x' })).toBe(0);
  });

  it('stays disabled when only part of the settings are present', () => {
    const { FIREBASE_VAPID_KEY, ...partial } = SETTINGS;
    void FIREBASE_VAPID_KEY;
    expect(build({}, partial).webConfig).toBeNull();
  });

  it('exposes only the public web settings when configured', () => {
    const service = build({});
    expect(service.webConfig).toEqual({ apiKey: 'key', projectId: 'proj', messagingSenderId: '123', appId: '1:123:web:abc', vapidKey: 'vapid' });
    expect(JSON.stringify(service.webConfig)).not.toContain('private_key');
  });
});

const url = process.env.PM_TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d('PushService token handling (MySQL)', () => {
  const prisma = new PrismaClient({ datasources: { db: { url: url as string } } });
  const stamp = Date.now();
  const userA = `fcm-test-a-${stamp}`;
  const userB = `fcm-test-b-${stamp}`;
  const tok = (n: string) => `token-${stamp}-${n}`;

  beforeEach(() => sendEachForMulticast.mockReset());
  afterAll(async () => {
    await prisma.fcmToken.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.$disconnect();
  });

  it('sends a data-only message to every device of the user', async () => {
    const service = build(prisma);
    await service.subscribe(userA, tok('a1'));
    await service.subscribe(userA, tok('a2'));
    sendEachForMulticast.mockResolvedValue({ successCount: 2, responses: [{ success: true }, { success: true }] });

    const delivered = await service.send([userA], { title: 'Ann started work', body: 'x', url: '/status', tag: 't' });

    expect(delivered).toBe(2);
    const call = sendEachForMulticast.mock.calls[0][0];
    expect([...call.tokens].sort()).toEqual([tok('a1'), tok('a2')].sort());
    expect(call.data).toEqual({ title: 'Ann started work', body: 'x', url: '/status', tag: 't' });
    expect(call.notification).toBeUndefined(); // data-only: our service worker shows it
  });

  it('forgets tokens Firebase says are gone, but keeps ones that merely failed', async () => {
    const service = build(prisma);
    await service.subscribe(userB, tok('gone'));
    await service.subscribe(userB, tok('flaky'));
    await service.subscribe(userB, tok('fine'));
    const order = (await prisma.fcmToken.findMany({ where: { userId: userB } })).map((r) => r.token);
    sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      responses: order.map((t) =>
        t === tok('gone') ? { success: false, error: { code: 'messaging/registration-token-not-registered' } }
        : t === tok('flaky') ? { success: false, error: { code: 'messaging/internal-error' } }
        : { success: true },
      ),
    });

    expect(await service.send([userB], { title: 'x' })).toBe(1);
    const left = (await prisma.fcmToken.findMany({ where: { userId: userB } })).map((r) => r.token).sort();
    expect(left).toEqual([tok('fine'), tok('flaky')].sort());
  });

  it('moves a shared browser to the new user without duplicating it', async () => {
    const service = build(prisma);
    await service.subscribe(userA, tok('shared'));
    await service.subscribe(userB, tok('shared'));
    const rows = await prisma.fcmToken.findMany({ where: { tokenHash: tokenHash(tok('shared')) } });
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userB);
  });

  it('only lets a user remove their own device', async () => {
    const service = build(prisma);
    await service.subscribe(userA, tok('mine'));
    await service.unsubscribe(userB, tok('mine'));
    expect(await prisma.fcmToken.count({ where: { tokenHash: tokenHash(tok('mine')) } })).toBe(1);
    await service.unsubscribe(userA, tok('mine'));
    expect(await prisma.fcmToken.count({ where: { tokenHash: tokenHash(tok('mine')) } })).toBe(0);
  });

  it('splits more than 500 devices into several Firebase requests', async () => {
    const service = build(prisma);
    await prisma.fcmToken.createMany({
      data: Array.from({ length: 501 }, (_, i) => ({ userId: userA, tokenHash: tokenHash(tok(`bulk-${i}`)), token: tok(`bulk-${i}`) })),
    });
    sendEachForMulticast.mockImplementation(async ({ tokens }: { tokens: string[] }) => ({
      successCount: tokens.length,
      responses: tokens.map(() => ({ success: true })),
    }));
    const delivered = await service.send([userA], { title: 'x' });
    const sizes = sendEachForMulticast.mock.calls.map((c) => c[0].tokens.length).sort((a, b) => b - a);
    expect(sizes.every((n) => n <= 500)).toBe(true);
    expect(sizes.length).toBeGreaterThanOrEqual(2);
    expect(delivered).toBeGreaterThanOrEqual(501);
  });

  it('survives Firebase being unreachable', async () => {
    const service = build(prisma);
    await service.subscribe(userB, tok('offline'));
    sendEachForMulticast.mockRejectedValue(new Error('network down'));
    await expect(service.send([userB], { title: 'x' })).resolves.toBe(0);
  });
});
