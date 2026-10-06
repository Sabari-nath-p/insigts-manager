/**
 * Exercises PushService against a local HTTPS server standing in for the browser vendor's push
 * service: real VAPID signing, real payload encryption, success and "device is gone" handling.
 * Needs a migrated MySQL database and the openssl binary:
 *   PM_TEST_DATABASE_URL=mysql://... npx jest push.integration
 * Skipped when the database variable is absent. Only touches its own push_subscriptions rows.
 */
import { execFileSync } from 'child_process';
import { createECDH, randomBytes } from 'crypto';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import * as https from 'https';
import { AddressInfo } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import * as webpush from 'web-push';
import { PushService, endpointHash } from './push.service';

const url = process.env.PM_TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

d('PushService against a stand-in push service', () => {
  const prisma = new PrismaClient({ datasources: { db: { url: url as string } } });
  let server: https.Server;
  let base = '';
  let dir = '';
  const seen: Array<{ path: string; headers: Record<string, string | string[] | undefined>; bytes: number }> = [];
  const userA = `push-test-a-${Date.now()}`;
  const userB = `push-test-b-${Date.now()}`;

  const device = (path: string) => {
    const ecdh = createECDH('prime256v1');
    ecdh.generateKeys();
    return { endpoint: `${base}${path}`, keys: { p256dh: b64url(ecdh.getPublicKey()), auth: b64url(randomBytes(16)) } };
  };

  const makeService = (withKeys: boolean) => {
    const vapid = webpush.generateVAPIDKeys();
    const env: Record<string, string> = withKeys ? { VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey } : {};
    const service = new PushService(prisma as never, { get: (k: string) => env[k] } as never);
    service.onModuleInit();
    // The stand-in uses a throwaway certificate, so skip verification for these requests only.
    service.sendOptions = { TTL: 60, agent: new https.Agent({ rejectUnauthorized: false }) };
    return service;
  };

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'push-'));
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem'), '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' });
    server = https.createServer({ key: readFileSync(join(dir, 'k.pem')), cert: readFileSync(join(dir, 'c.pem')) }, (req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        seen.push({ path: req.url ?? '', headers: req.headers, bytes: Buffer.concat(chunks).length });
        res.statusCode = req.url?.startsWith('/gone') ? 410 : 201;
        res.end();
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `https://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await prisma.pushSubscription.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.$disconnect();
    await new Promise((r) => server.close(r));
    rmSync(dir, { recursive: true, force: true });
  });

  it('sends a signed, encrypted push to every device of the user', async () => {
    const service = makeService(true);
    await service.subscribe(userA, device('/ok-1'));
    await service.subscribe(userA, device('/ok-2'));
    seen.length = 0;
    const delivered = await service.send([userA], { title: 'Ann started work', url: '/status' });
    expect(delivered).toBe(2);
    expect(seen).toHaveLength(2);
    for (const r of seen) {
      expect(String(r.headers.authorization)).toMatch(/^vapid /);
      expect(r.headers['content-encoding']).toBe('aes128gcm');
      expect(r.bytes).toBeGreaterThan(50);
    }
  });

  it('removes a device the push service reports as gone', async () => {
    const service = makeService(true);
    const gone = device('/gone-1');
    await service.subscribe(userB, gone);
    expect(await service.send([userB], { title: 'x' })).toBe(0);
    expect(await prisma.pushSubscription.count({ where: { endpointHash: endpointHash(gone.endpoint) } })).toBe(0);
  });

  it('re-subscribing the same device moves it to the new user without duplicating it', async () => {
    const service = makeService(true);
    const shared = device('/ok-shared');
    await service.subscribe(userA, shared);
    await service.subscribe(userB, shared);
    const rows = await prisma.pushSubscription.findMany({ where: { endpointHash: endpointHash(shared.endpoint) } });
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userB);
  });

  it('unsubscribe only removes the caller\'s own device', async () => {
    const service = makeService(true);
    const mine = device('/ok-mine');
    await service.subscribe(userA, mine);
    await service.unsubscribe(userB, mine.endpoint);
    expect(await prisma.pushSubscription.count({ where: { endpointHash: endpointHash(mine.endpoint) } })).toBe(1);
    await service.unsubscribe(userA, mine.endpoint);
    expect(await prisma.pushSubscription.count({ where: { endpointHash: endpointHash(mine.endpoint) } })).toBe(0);
  });

  it('does nothing, without throwing, when no VAPID keys are configured', async () => {
    const service = makeService(false);
    await service.subscribe(userA, device('/ok-disabled'));
    seen.length = 0;
    expect(await service.send([userA], { title: 'x' })).toBe(0);
    expect(seen).toHaveLength(0);
    expect(service.publicKey).toBeNull();
  });
});
