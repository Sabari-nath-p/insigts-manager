# Project management: decisions

One line each: decision, then reason. `PM_BUILD_PLAN.md` is the source brief; where it conflicts with the existing app, the existing app wins.

## Isolation
- Backend lives in `backend/src/projects/` and routes under `/api/pm/*`. It reads the `users` table and nothing else from other modules, and writes only `pm_*` tables. Reason: attendance and CRM must not be affected.
- Frontend lives under `/projects/*` (pages) and `/api/pm/*` (proxy route handlers). Reason: separate URL space on the same site.
- Shared files edited, and only additively: `backend/prisma/schema.prisma` (new models and enums appended), `backend/src/app.module.ts` (one import), both `package.json` files (scripts, dependencies) and the frontend lockfile, `frontend/src/lib/nav.ts` (one nav link).
- The migration only contains `CREATE TABLE` for `pm_*`. Verified: no `ALTER` or `DROP`. Reason: existing data stays untouched.

## Stack deviations from the plan
- NestJS + Prisma + MySQL instead of SQLite + Drizzle. Reason: the app already runs on MySQL via Prisma; a second database would be a second thing to run.
- Existing JWT login instead of Auth.js; no workspaces, invites, password reset or avatar upload. Reason: users are already managed in `/admin/users`; the whole company is the one workspace.
- Existing `users` rows are the people. Reason: requested.
- Plain `xxxId` columns with no Prisma relations, uuid ids. Reason: matches the rest of the schema.
- Tailwind v4 and the existing theme tokens, plus the existing Radix and lucide dependencies. Reason: already in the repo, keeps the new area visually consistent.
- Class-validator DTOs on the server instead of Zod. Reason: already the backend convention.
- Fractional ordering uses a `Double` position with midpoint inserts and a one-off renumber when two neighbours collapse. Reason: simple and conflict-tolerant.
- Cycle time = `completedAt - COALESCE(startedAt, createdAt)`; `startedAt` is set the first time a task leaves a Todo column. Reason: cheap and computable in SQL.
- Dates in insights use UTC calendar days (the database and Node both run UTC). Reason: matches the compose config.

## Access
- Default PM role: `super_admin` is PM admin, everyone else is staff. An optional `pm_members` row overrides this (`admin`/`staff`/`revoked`). Reason: the owner decides who gets admin later; they can do it from the Team page without a deploy.
- "Owner" in the plan maps to PM admin; there can be several. Reason: that follows from the owner choosing admins.
- Staff cannot see per-member comparisons: the API returns `workload: null` and ignores the member filter for them.
- A staff user who archives or deletes only affects things they created; admins can do anything.

## Insights rules
- Stuck = open task with no `task.created`, `task.moved` or `update.posted` activity for more than 5 days.
- Project health: Behind = more than 25% of open tasks overdue; At risk = more than 10% overdue or more than 3 stuck; otherwise On track.
- High load = open count above 1.5x the average of members who have open work (needs at least two such members).
- On-time rate card is hidden below 5 completed tasks that had a due date.

## Process
- Work is on branch `projects-module`, one local commit per phase, not pushed.
- Live notification polling instead of WebSockets, as specified.

## Docs and tests
- Module docs are in `PROJECTS.md`, not the root README. Reason: the root README belongs to the existing app.
- Backend has no ESLint config, so there is no backend lint step to run. `tsc --noEmit` and jest are the checks.
- Playwright tests create their own users and projects, so they only run against a disposable database.
- No workspace-isolation test: there is one workspace (the whole company), so there is nothing to isolate. Access control is covered by the permission and e2e tests.
- No invite, password-reset or avatar flows, and no email notifier. Accounts, passwords and profile live in the existing app. Reason: out of scope once users are shared.

## Notifications (branch notifications)
- Browser push uses free Web Push with VAPID keys; no paid provider. Reason: asked for no cost.
- Presence announcements fire from the two places a status is saved (attendance sync and the manual status endpoint), via a global notifications module with no dependency on attendance. Reason: smallest edit to existing modules, no circular imports.
- Announced: started, paused, resumed. Silent: meeting, leave, check-out, work logs. Reason: what was asked; one function to widen.
- Reminder and Projects due-date job both run at 10:00 company time (APP_TIMEZONE) and are registered at startup, not with decorators, so the timezone comes from the loaded environment.
- Projects due-date job now also sends "due today" besides "due tomorrow".
