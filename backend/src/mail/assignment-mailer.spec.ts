import { AssignmentMailer, MAIL_BATCH_MS } from './assignment-mailer.service';

const USERS = [
  { id: 'a1', fullName: 'Asha Nair', email: 'asha@test.example', isActive: true },
  { id: 'u1', fullName: 'Rohan Das', email: 'rohan@test.example', isActive: true },
  { id: 'u2', fullName: 'Meera Pillai', email: 'meera@test.example', isActive: true },
  { id: 'u3', fullName: 'Gone Away', email: 'gone@test.example', isActive: false },
];
const TASKS = [
  { id: 't1', number: 1, title: 'Poster 1', projectId: 'p1' },
  { id: 't2', number: 2, title: 'Poster 2', projectId: 'p1' },
  { id: 't3', number: 3, title: 'Carousel 1', projectId: 'p1' },
];

interface SentMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

function setup(opts: { enabled?: boolean; assigned?: string[] } = {}) {
  // "user:task" pairs that are still true when the email is built.
  const assigned = new Set(opts.assigned ?? ['u1:t1', 'u1:t2', 'u1:t3', 'u2:t1', 'u3:t1']);
  const prisma = {
    user: { findMany: jest.fn(async ({ where }: { where: { id: { in: string[] } } }) => USERS.filter((u) => where.id.in.includes(u.id))) },
    pmTaskAssignee: {
      findMany: jest.fn(async ({ where }: { where: { userId: string; taskId: { in: string[] } } }) =>
        where.taskId.in.filter((id) => assigned.has(`${where.userId}:${id}`)).map((taskId) => ({ taskId })),
      ),
    },
    pmTask: { findMany: jest.fn(async ({ where }: { where: { id: { in: string[] } } }) => TASKS.filter((t) => where.id.in.includes(t.id))) },
    pmProject: { findMany: jest.fn(async () => [{ id: 'p1', key: 'AB', name: 'Arena Bangalore' }]) },
  };
  const mail = { enabled: opts.enabled ?? true, appUrl: 'https://insights.example.com', send: jest.fn<Promise<boolean>, [SentMail]>(async () => true) };
  const mailer = new AssignmentMailer(prisma as never, mail as never);
  return { mailer, prisma, mail };
}

const wait = () => jest.advanceTimersByTimeAsync(MAIL_BATCH_MS + 10);

describe('assignment mailer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('waits a minute, then sends one email to the person', async () => {
    const { mailer, mail } = setup();
    mailer.queue(['u1'], 't1', 'a1');

    expect(mail.send).not.toHaveBeenCalled(); // nothing goes out straight away
    await wait();

    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send.mock.calls[0][0]).toMatchObject({ to: 'rohan@test.example', subject: 'Asha Nair assigned you AB-1: Poster 1' });
  });

  it('several assignments to the same person in that minute become one email', async () => {
    const { mailer, mail } = setup();
    mailer.queue(['u1'], 't3', 'a1');
    mailer.queue(['u1'], 't1', 'a1');
    mailer.queue(['u1'], 't2', 'a1');
    await wait();

    expect(mail.send).toHaveBeenCalledTimes(1);
    const sent = mail.send.mock.calls[0][0] as { subject: string; text: string };
    expect(sent.subject).toBe('Asha Nair assigned you 3 tasks');
    expect(sent.text.indexOf('AB-1')).toBeLessThan(sent.text.indexOf('AB-2')); // in task order, however they were queued
  });

  it('different people each get their own email', async () => {
    const { mailer, mail } = setup();
    mailer.queue(['u1', 'u2'], 't1', 'a1');
    await wait();

    expect(mail.send.mock.calls.map((c) => (c[0] as { to: string }).to).sort()).toEqual(['meera@test.example', 'rohan@test.example']);
  });

  it('nobody is emailed about assigning themselves', async () => {
    const { mailer, mail } = setup();
    mailer.queue(['a1'], 't1', 'a1');
    await wait();

    expect(mail.send).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('a task they were taken off again within the minute is left out, and nothing is sent if none remain', async () => {
    const { mailer, mail } = setup({ assigned: ['u1:t1'] }); // still on t1 only
    mailer.queue(['u1'], 't1', 'a1');
    mailer.queue(['u1'], 't2', 'a1');
    await wait();
    expect((mail.send.mock.calls[0][0] as { subject: string }).subject).toContain('AB-1');

    const none = setup({ assigned: [] });
    none.mailer.queue(['u1'], 't1', 'a1');
    await wait();
    expect(none.mail.send).not.toHaveBeenCalled();
  });

  it('a deactivated account is never emailed', async () => {
    const { mailer, mail } = setup();
    mailer.queue(['u3'], 't1', 'a1');
    await wait();

    expect(mail.send).not.toHaveBeenCalled();
  });

  it('does nothing at all when email is not set up', async () => {
    const { mailer, mail, prisma } = setup({ enabled: false });
    mailer.queue(['u1'], 't1', 'a1');
    await wait();

    expect(jest.getTimerCount()).toBe(0);
    expect(mail.send).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('a database or mail failure is swallowed: it never throws and never stops later emails', async () => {
    const { mailer, mail, prisma } = setup();
    prisma.user.findMany.mockRejectedValueOnce(new Error('database hiccup'));
    mailer.queue(['u1'], 't1', 'a1');
    await expect(wait()).resolves.not.toThrow();
    expect(mail.send).not.toHaveBeenCalled();

    mail.send.mockRejectedValueOnce(new Error('smtp down'));
    mailer.queue(['u2'], 't1', 'a1');
    await expect(wait()).resolves.not.toThrow();

    mailer.queue(['u1'], 't1', 'a1');
    await wait();
    expect(mail.send).toHaveBeenCalledTimes(2); // the one that failed, and the later one that worked
  });

  it('forgets what is waiting on shutdown instead of keeping the server alive', () => {
    const { mailer } = setup();
    mailer.queue(['u1'], 't1', 'a1');
    expect(jest.getTimerCount()).toBe(1);
    mailer.onModuleDestroy();
    expect(jest.getTimerCount()).toBe(0);
  });
});
