/**
 * Verifies the insights SQL against hand-computed numbers. Needs a migrated MySQL database:
 *   PM_TEST_DATABASE_URL=mysql://... npx jest insights.integration
 * Skipped (not failed) when the variable is absent. Only creates and removes its own pm_* rows.
 */
import { PrismaClient } from '@prisma/client';
import { InsightsService } from './insights.service';
import { PmAccessService } from './pm-access.service';
import { addDays, todayUtc } from './pm-dates';

const url = process.env.PM_TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d('InsightsService against MySQL', () => {
  const prisma = new PrismaClient({ datasources: { db: { url: url as string } } });
  const service = new InsightsService(prisma as never, new PmAccessService(prisma as never));
  const admin = { userId: 'admin', role: 'admin' as const };
  const staff = { userId: 'staff', role: 'staff' as const };
  const today = todayUtc();
  const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000);
  let projectId = '';

  beforeAll(async () => {
    const p = await prisma.pmProject.create({ data: { key: 'ITEST', name: 'Integration', createdBy: 'admin' } });
    projectId = p.id;
    const [todo, doing, done] = await Promise.all(
      (['todo', 'doing', 'done'] as const).map((type, i) => prisma.pmColumn.create({ data: { projectId, name: type, type, position: i } })),
    );
    let n = 0;
    const task = (o: Record<string, unknown>) =>
      prisma.pmTask.create({ data: { projectId, number: ++n, title: `t${n}`, position: n, createdBy: 'admin', columnId: todo.id, ...o } as never });

    // Six completed in the last 10 days with cycle times 1,2,3,4,5,6 days; first five on time, last late.
    for (let i = 1; i <= 6; i++) {
      await task({
        columnId: done.id,
        createdAt: at(10),
        startedAt: new Date(at(i).getTime() - i * 86_400_000), // started i days before completion
        completedAt: at(i),
        dueDate: i <= 5 ? addDays(today, 1) : addDays(today, -30),
        assigneeId: 'm1',
      });
    }
    // Open: 2 overdue (one idle 9 days), 1 open with no due date, 1 archived (must be ignored).
    await task({ columnId: doing.id, dueDate: addDays(today, -3), assigneeId: 'm1', createdAt: at(9) });
    await task({ columnId: todo.id, dueDate: addDays(today, -1), assigneeId: 'm2', createdAt: at(1) });
    await task({ columnId: todo.id, assigneeId: 'm2', createdAt: at(1) });
    await task({ columnId: todo.id, archivedAt: new Date(), createdAt: at(1) });
  });

  afterAll(async () => {
    const ids = (await prisma.pmTask.findMany({ where: { projectId }, select: { id: true } })).map((t) => t.id);
    await prisma.pmActivity.deleteMany({ where: { projectId } });
    await prisma.pmTaskLabel.deleteMany({ where: { taskId: { in: ids } } });
    await prisma.pmTask.deleteMany({ where: { projectId } });
    await prisma.pmColumn.deleteMany({ where: { projectId } });
    await prisma.pmProject.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  it('computes summary numbers exactly', async () => {
    const r = await service.insights(admin, { range: '30d', project: 'ITEST' });
    expect(r.summary.open).toBe(3); // archived excluded, done excluded
    expect(r.summary.completed).toBe(6);
    expect(r.summary.overdue).toBe(2);
    expect(r.summary.onTimeRate).toBe(83); // 5 of 6 were on time
    expect(r.summary.completedPrev).toBe(0);
    expect(r.summary.completedChangePct).toBeNull();
  });

  it('computes the median cycle time', async () => {
    const r = await service.insights(admin, { range: '30d', project: 'ITEST' });
    expect(r.summary.medianCycleDays).toBe(3.5); // median of 1..6 days
  });

  it('buckets throughput per day and keeps burn-up cumulative', async () => {
    const r = await service.insights(admin, { range: '30d', project: 'ITEST' });
    expect(r.throughput.daily.reduce((s, x) => s + x.count, 0)).toBe(6);
    expect(r.burnup.completed.at(-1)).toBe(6);
    expect(r.burnup.created.at(-1)).toBe(9); // 9 non-archived tasks created within 30 days
  });

  it('finds stuck work and orders it by idle time', async () => {
    const r = await service.insights(admin, { range: '30d', project: 'ITEST' });
    expect(r.stuck).toHaveLength(1);
    expect(r.stuck[0].ref).toBe('ITEST-7');
    expect(r.stuck[0].daysIdle).toBeGreaterThanOrEqual(9);
  });

  it('reports workload for admins only', async () => {
    const a = await service.insights(admin, { range: '30d', project: 'ITEST' });
    expect(a.workload?.find((w) => w.id === 'm2')?.open).toBe(2);
    expect(a.workload?.find((w) => w.id === 'm1')?.open).toBe(1);
    const s = await service.insights(staff, { range: '30d', project: 'ITEST', member: 'm1' });
    expect(s.workload).toBeNull();
    expect(s.scope.member).toBeNull();
  });

  it('respects the date range', async () => {
    const r = await service.insights(admin, { from: addDays(today, -3), to: today, project: 'ITEST' });
    expect(r.summary.completed).toBe(3); // completed 1, 2 and 3 days ago
  });

  it('builds the project health row from the same data', async () => {
    const r = await service.insights(admin, { range: '30d', project: 'ITEST' });
    const row = r.health.find((h) => h.key === 'ITEST');
    expect(row).toMatchObject({ open: 3, overdue: 2, stuck: 1, doneInRange: 6, status: 'Behind' });
  });
});
