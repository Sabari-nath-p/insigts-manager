/**
 * Demo data for project management: `npm run pm:seed` (add `-- --reset` to replace earlier demo data).
 *
 * Writes only to pm_* tables. People are the existing active users, so it needs at least one.
 * Refuses to run when pm_projects already has rows unless --reset is passed, and --reset only
 * deletes pm_* rows. Nothing outside the pm_* tables is ever modified.
 */
import { PrismaClient, PmColumnType, PmPriority } from '@prisma/client';

const prisma = new PrismaClient();

// Small deterministic generator so reruns produce the same shape of data.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

const PROJECTS = [
  { key: 'WEB', name: 'Website Relaunch', color: '#146356', labels: ['frontend', 'design', 'content', 'seo'] },
  { key: 'APP', name: 'Mobile App', color: '#0075de', labels: ['ios', 'android', 'api', 'bug'] },
  { key: 'OPS', name: 'Internal Ops', color: '#dd5b00', labels: ['process', 'tooling', 'hiring'] },
  { key: 'MKT', name: 'Q4 Campaign', color: '#7a5af8', labels: ['copy', 'ads', 'email', 'social'] },
  { key: 'DAT', name: 'Data Cleanup', color: '#2a9d99', labels: ['migration', 'quality', 'reporting'] },
];

const TITLES = [
  'Audit current navigation', 'Write launch checklist', 'Fix broken form validation', 'Draft pricing page copy',
  'Set up staging environment', 'Review analytics events', 'Compress hero images', 'Add empty states to dashboard',
  'Resolve duplicate customer records', 'Prepare handover notes', 'Test checkout on slow networks', 'Update onboarding emails',
  'Plan sprint demo', 'Document API error codes', 'Tidy up shared drive', 'Refresh brand colours in templates',
  'Investigate slow report export', 'Schedule social posts', 'Collect testimonials', 'Migrate old blog posts',
  'Add alt text to product photos', 'Reconcile monthly invoices', 'Interview two candidates', 'Rebuild the weekly report',
  'Fix timezone bug in reminders', 'Prototype the settings screen', 'Back up the old database', 'Write release notes',
];

const UPDATES = [
  'API done, waiting on design for the empty state.', 'Started on this, about half way.', 'Blocked on access to the staging server.',
  'Sent to review, small copy changes expected.', 'Finished and merged. Needs a quick check by someone else.',
  'Customer replied, adjusting the scope slightly.', 'Spent the morning on this. Tests are passing now.',
  'Pushed a first version, feedback welcome.', 'Waiting on the supplier, chasing again tomorrow.',
];

async function main() {
  const reset = process.argv.includes('--reset');
  const existing = await prisma.pmProject.count();
  if (existing > 0 && !reset) {
    console.log(`pm_projects already has ${existing} rows. Pass --reset to replace the project-management data.`);
    return;
  }
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  if (users.length === 0) throw new Error('No active users found. Create a user first, then seed.');
  const ids = users.map((u) => u.id);

  if (reset) {
    for (const table of ['pmTaskAssignee', 'pmNotification', 'pmActivity', 'pmUpdate', 'pmTaskLabel', 'pmTask', 'pmLabel', 'pmColumn', 'pmProject'] as const) {
      await (prisma[table] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();
    }
  }

  const now = Date.now();
  let totalTasks = 0;

  for (const p of PROJECTS) {
    const project = await prisma.pmProject.create({ data: { key: p.key, name: p.name, color: p.color, createdBy: ids[0] } });
    const cols = await Promise.all(
      (['todo', 'doing', 'review', 'done'] as PmColumnType[]).map((type, i) =>
        prisma.pmColumn.create({ data: { projectId: project.id, name: type[0].toUpperCase() + type.slice(1), type, position: (i + 1) * 1000 } }),
      ),
    );
    const labels = await Promise.all(p.labels.map((name) => prisma.pmLabel.create({ data: { projectId: project.id, name, color: pick(['#146356', '#0075de', '#dd5b00', '#787671']) } })));

    const count = Number(process.env.PM_SEED_TASKS_PER_PROJECT ?? 60);
    const positions: Record<string, number> = {};
    for (let n = 1; n <= count; n++) {
      const roll = rand();
      // About half done, the rest spread over the open columns.
      const col = roll < 0.5 ? cols[3] : roll < 0.68 ? cols[0] : roll < 0.84 ? cols[1] : cols[2];
      const isDone = col.type === 'done';
      // Open work is mostly recent; a small share is old and idle, which is what shows up as "stuck".
      const ageDays = isDone ? Math.floor(rand() * 90) : rand() < 0.12 ? 20 + Math.floor(rand() * 50) : Math.floor(rand() * 18);
      const createdAt = new Date(now - ageDays * DAY - Math.floor(rand() * DAY));
      const startedAt = col.type === 'todo' ? null : new Date(createdAt.getTime() + Math.floor(rand() * 4) * DAY);
      const rawDone = (startedAt ?? createdAt).getTime() + (1 + Math.floor(rand() * 12)) * DAY;
      // Anything that would land in the future is pulled back into the last few days instead of piling up on today.
      const completedAt = isDone ? new Date(rawDone > now ? now - Math.floor(rand() * 5) * DAY - Math.floor(rand() * DAY) : rawDone) : null;
      const due = rand() < 0.7 ? iso(new Date(isDone ? (completedAt as Date).getTime() + Math.floor(rand() * 12 - 4) * DAY : now + Math.floor(rand() * 17 - 2) * DAY)) : null;
      positions[col.id] = (positions[col.id] ?? 0) + 1000;

      const task = await prisma.pmTask.create({
        data: {
          projectId: project.id,
          columnId: col.id,
          number: n,
          title: pick(TITLES),
          description: rand() < 0.4 ? 'Context and acceptance notes go here.\n\n- Check with the owner\n- Link the final result' : null,
          priority: pick<PmPriority>(['low', 'medium', 'medium', 'high', 'urgent']),
          dueDate: due,
          position: positions[col.id],
          createdBy: pick(ids),
          startedAt,
          completedAt,
          createdAt,
          updatedAt: completedAt ?? startedAt ?? createdAt,
        },
      });
      totalTasks++;

      // About 85% of tasks have someone on them, and roughly one in five of those has a second person.
      if (rand() < 0.85) {
        const first = pick(ids);
        const others = ids.filter((id) => id !== first);
        const people = others.length > 0 && rand() < 0.2 ? [first, pick(others)] : [first];
        await prisma.pmTaskAssignee.createMany({ data: people.map((userId) => ({ taskId: task.id, userId })) });
      }

      const taskLabels = labels.filter(() => rand() < 0.25);
      if (taskLabels.length) await prisma.pmTaskLabel.createMany({ data: taskLabels.map((l) => ({ taskId: task.id, labelId: l.id })) });

      const activity: Array<{ type: string; at: Date; meta?: object }> = [{ type: 'task.created', at: createdAt }];
      if (startedAt) activity.push({ type: 'task.moved', at: startedAt, meta: { from: 'Todo', to: 'Doing' } });
      if (completedAt) {
        activity.push({ type: 'task.moved', at: completedAt, meta: { from: 'Review', to: 'Done' } });
        activity.push({ type: 'task.completed', at: completedAt });
      }
      if (rand() < 0.5) {
        const at = new Date(createdAt.getTime() + Math.floor(rand() * 8 + 1) * DAY);
        if (at.getTime() < now && (!completedAt || at < completedAt)) {
          await prisma.pmUpdate.create({ data: { taskId: task.id, authorId: pick(ids), body: pick(UPDATES), createdAt: at, updatedAt: at } });
          activity.push({ type: 'update.posted', at });
        }
      }
      await prisma.pmActivity.createMany({
        data: activity.map((a) => ({ projectId: project.id, taskId: task.id, actorId: task.createdBy, type: a.type, meta: a.meta, createdAt: a.at })),
      });
    }
    await prisma.pmProject.update({ where: { id: project.id }, data: { nextTaskNumber: count + 1 } });
  }
  console.log(`Seeded ${PROJECTS.length} projects and ${totalTasks} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
