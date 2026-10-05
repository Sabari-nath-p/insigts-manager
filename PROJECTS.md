# Projects (project management)

A small-team project tool inside the same site: projects, kanban boards, tasks, assignments, work updates and insights. It lives under `/projects` and does not touch attendance, CRM, payroll or any other module's data.

## What it is
- `/projects` project list, `/projects/<KEY>` board (also a List view), `/projects/my-work`, `/projects/insights`, `/projects/team`.
- Backend: `backend/src/projects/`, API under `/api/pm/*`. Frontend: `frontend/src/app/projects/`, `frontend/src/lib/pm/`, browser calls go through `/api/pm/*`.
- People are the existing users. Log in the same way; there is no separate account.

## Isolation
- Writes only to `pm_*` tables. Reads only `users` (name, email, active flag, role) from the rest of the system.
- The migration `backend/prisma/migrations/20261005000000_pm_init/` contains only `CREATE TABLE` for 9 `pm_*` tables.
- Shared files touched, additively: `backend/prisma/schema.prisma` (models appended), `backend/src/app.module.ts` (one import), both `package.json` files and the frontend lockfile, `frontend/src/lib/nav.ts` (one sidebar link).

## Access
| | Admin | Staff |
|---|---|---|
| Create projects, tasks, move, assign, post updates | yes | yes |
| Rename project, delete any project or task | yes | no |
| Archive project / delete task | any | only ones they created |
| Workspace and per-member insights, workload | yes | no (project insights and My stats only) |
| Change who has access (Team page) | yes | no |

Default: `super_admin` users are Admin, everyone else is Staff. An admin can promote, demote or remove someone's access from `/projects/team`. That is stored in `pm_members` and never changes the user's role in the rest of the system.

## Setup
1. Create the tables. If your database is managed with `prisma migrate`:
   `cd backend && npx prisma migrate deploy`
   If it was created another way (no `_prisma_migrations` table), run `backend/prisma/migrations/20261005000000_pm_init/migration.sql` against the database. It only creates new tables.
2. Rebuild and restart the backend and frontend as usual.
3. Optional demo data (writes only `pm_*`, uses existing active users as people): `cd backend && npm run pm:seed`. It refuses to run when projects already exist; `-- --reset` replaces earlier project-management data only. `PM_SEED_TASKS_PER_PROJECT` controls size (default 60 per project, 5 projects).

No new environment variables are needed.

## Scheduled job
Daily at 07:00 UTC the backend notifies assignees of open tasks due tomorrow (`PmDueSoonJob`). An admin can also trigger it with `POST /api/pm/cron/due-soon`. It runs inside the backend process, so no external cron is needed; run a single backend instance.

## Tests
- Unit (no database): `cd backend && npx jest`
- SQL checks against MySQL: `PM_TEST_DATABASE_URL=mysql://user:pass@host:3306/db npx jest insights.integration` (migrated database; it creates and removes only its own `pm_*` rows).
- Browser smoke tests: start the backend against a disposable database, then `cd frontend && npm run build && npm run test:e2e`. Defaults: API `http://localhost:3011/api`, admin `admin@test.local` / `ChangeMe123!` (override with `E2E_API_URL`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`). The tests create their own users and projects, so never point them at a real database.

## Shortcuts
`C` new task, `/` filter, `Ctrl/Cmd K` search and jump, `G` then `B`/`M`/`I` board / My Work / Insights, `Esc` close, `?` list.
