# PROJECT MANAGEMENT APP — AUTONOMOUS BUILD BRIEF

> ## NON-NEGOTIABLE RULE: SIMPLE, FAST, NO BLOAT
>
> This is a small-team project management tool: **projects, kanban boards, tasks, assignments, work updates, and insights.** Nothing else. It must feel instant, calm and clean. If a feature looks like it belongs in an enterprise "platform", it is out.
>
> **Banned scope (do not build, do not stub, do not add settings for it)**
> - AI agents, automations, workflows, policies, governance, scoring, prompt registries, sandboxes, terminals.
> - Plugin systems, webhooks, integrations, external tracker sync, MCP servers, CLI tools, Electron/desktop app.
> - A settings area with tabs. The only settings are: your profile, theme, and (owner) workspace name + members.
> - Telemetry, Prometheus, audit trails beyond the activity feed described below.
> - Monorepo with multiple packages. One app, one repo.
>
> **Banned visual patterns**
> - Gradients, glassmorphism, glow shadows, blobs, noise overlays, neon or dark "hacker" aesthetics.
> - Emoji as icons in UI. Gradient or rainbow text. Purple-to-blue "AI" colour schemes.
> - Over-rounded cards (max 8px radius). Heavy drop shadows (use 1px borders).
> - Scroll-triggered fade/slide animations. Motion only for drawers, modals, drag, hover and toasts, 150ms or less, `transform`/`opacity` only.
>
> **Banned copy**
> - Hype words: elevate, unleash, seamless, supercharge, empower, unlock, game-changer, next-level.
> - Exclamation marks in UI copy. Fake statistics. Lorem ipsum.
> - Empty states must say what to do next in one plain sentence ("No tasks yet. Press C to add one.").
>
> **Required instead**
> - Dense, scannable, calm UI. White/light-neutral surfaces, one solid brand colour, status colours used sparingly.
> - Everything feels instant: optimistic updates, no spinners for normal actions, keyboard shortcuts for the common ones.
> - One icon set (lucide), thin and neutral.
>
> **Self-check:** after every phase, audit each screen against this block, fix violations, and record the result in `PROGRESS.md`.

You are building a complete, production-quality project management app for small teams. This document is the single source of truth. Read it fully before writing code.

---

## 0. OPERATING RULES

1. **Do not ask the user questions.** Choose the most sensible default, record it in `DECISIONS.md` (one line: decision + reason), and continue.
2. **Work in phases** (Section 11). Finish each phase, make it run, commit, then move on.
3. **Track progress in `PROGRESS.md`.** After every phase, record what is done, what is next, and known issues. At the start of any session, read `PROGRESS.md` first if it exists and continue from there.
4. **Commit with git** after each phase (`phase 3: board + drag and drop`).
5. **Never leave the app broken.** Before each commit: `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` must pass.
6. **No `TODO: implement` placeholders.** If something depends on external credentials (email), build it behind an interface with a safe fallback (log invites and emails to the console in dev).
7. Prefer server components and server actions. Keep client components small. Keep the client bundle lean (target: under 150 KB gzipped for the board page, excluding images).

---

## 1. TECH STACK (FIXED)

| Layer | Choice |
| --- | --- |
| Framework | Next.js (latest stable, App Router) + TypeScript (strict) |
| Styling | Tailwind CSS, CSS variables for theme tokens, a few shadcn/ui primitives (dialog, dropdown, popover, command) |
| Database | SQLite via Drizzle ORM (single file, zero infra; schema kept portable to Postgres) |
| Auth | Auth.js (credentials + email invite links), bcrypt |
| Data fetching | TanStack Query with optimistic updates for every mutation |
| Drag and drop | @dnd-kit (core + sortable) |
| Charts | Recharts (insights page only, loaded lazily) |
| Validation | Zod (shared by client and server) |
| Email | Nodemailer via SMTP; console transport in dev |
| Testing | Vitest (unit) + Playwright (e2e smoke) |

Provide `.env.example` and a `README.md` with setup steps (`npm i`, `npm run db:migrate`, `npm run seed`, `npm run dev`). No Docker required.

---

## 2. PRODUCT SCOPE

A **workspace** has one **Owner** and any number of **Staff**. The workspace holds **Projects**. Each project has a **kanban board** of **Tasks**. Tasks are assigned to members, and members post **work updates** on tasks. An **Insights** area shows how work is flowing.

### Roles

| Permission | Owner | Staff |
| --- | --- | --- |
| Create / edit tasks, move cards, comment, post updates | Yes | Yes |
| Assign tasks to any member | Yes | Yes |
| Create projects | Yes | Yes |
| Rename / archive / delete projects | Yes | Archive own only |
| Invite and remove members, change roles | Yes | No |
| Workspace-wide insights (all members) | Yes | Own stats and project insights only |
| Delete workspace, rename workspace | Yes | No |

Implement a single `can(user, action, resource?)` helper with a permission map. Enforce it on **every** server action and API route, not just in the UI. Exactly one Owner per workspace; the Owner cannot be removed or downgraded from the UI. Ownership transfer is out of scope.

---

## 3. DATA MODEL (DRIZZLE)

Use text ids (cuid2), `createdAt` and `updatedAt` on every table, and indexes for every foreign key and every column used in filters.

- **users**: id, name, email (unique), avatarUrl, passwordHash (nullable until invite accepted), isActive, lastLoginAt.
- **workspaces**: id, name, ownerId.
- **members**: workspaceId, userId, role (`owner` | `staff`), status (`active` | `invited` | `removed`). Unique on (workspaceId, userId).
- **invite_tokens**: userId, tokenHash, expiresAt (48h), usedAt.
- **password_reset_tokens**: userId, tokenHash, expiresAt (1h), usedAt.
- **projects**: id, workspaceId, name, key (short code like `WEB`), color, description, status (`active` | `archived`), createdBy.
- **columns**: id, projectId, name, position, type (`todo` | `doing` | `review` | `done`). Seed four defaults per project. Columns can be renamed and reordered, but each project must keep at least one `done` column (it drives insights).
- **tasks**: id, projectId, columnId, number (per-project sequence, shown as `WEB-12`), title, description (markdown), priority (`low` | `medium` | `high` | `urgent`), assigneeId (nullable), dueDate (nullable), position (fractional index string or float), createdBy, completedAt (set when moved into a `done` column, cleared when moved out), archivedAt.
- **task_labels**: taskId, labelId. **labels**: id, projectId, name, color.
- **updates**: id, taskId, authorId, body, createdAt. The work-update feed on each task.
- **activity**: id, workspaceId, projectId, taskId, actorId, type (`task.created` | `task.moved` | `task.assigned` | `task.completed` | `update.posted` | `due.changed` | `priority.changed`), meta (JSON: from/to values), createdAt. Written by the same server action that makes the change. This table powers the activity feed and the insights.
- **notifications**: id, userId, type, taskId, actorId, readAt, createdAt.

---

## 4. SCREENS

### 4.1 App shell
- **Sidebar:** workspace name, My Work, Insights, project list (with colour dot and open-task count), "+ New project", team link. Collapsible on mobile.
- **Top bar:** command palette trigger (Cmd/Ctrl+K), notification bell with unread count, avatar menu (profile, theme, sign out).
- **Command palette:** search tasks and projects, jump to a project, create a task, "Assigned to me".

### 4.2 Project board (`/p/[key]`)
- Columns left to right: Todo, Doing, Review, Done (renamable).
- Card shows: key and number, title, priority marker, assignee avatar, due date (red when overdue), label chips, update count.
- **Drag and drop** between and within columns, with optimistic reordering. Keyboard-accessible drag.
- **Inline add:** "+ Add task" at the bottom of each column; type a title and press Enter to add the next one.
- **Filters bar:** assignee (including "Me" and "Unassigned"), priority, label, due (overdue / this week), text search. Filter state lives in the URL.
- **Views:** Board (default) and List (dense table, sortable). Same data, same filters.
- Column task counts; Done column collapses tasks older than 14 days into "N older completed tasks".

### 4.3 Task drawer
Slide-in panel (URL-addressable: `/p/WEB?task=WEB-12`), autosaves on blur.
- Title, description (markdown with preview), status, assignee picker, priority, due date, labels.
- **Updates feed:** composer at the top ("Post a work update"), newest first, author avatar, relative time. Posting an update notifies the assignee and the task creator.
- **Activity timeline** below updates: moves, assignment changes, due-date changes.
- Archive and delete (owner can delete anything, staff can delete tasks they created).

### 4.4 My Work (`/my-work`)
All tasks assigned to the current user across projects, grouped: Overdue, Today, This week, Later, No date. Quick status change and quick update post inline.

### 4.5 Team (`/team`)
- All members: name, email, role, status, open task count, last active.
- **Owner only:** invite by email (name + email), resend invite, remove access (confirm; tasks assigned to them become unassigned and the owner is told how many), restore access.
- Invite flow: email with a "Set up your account" link, token hashed, 48h expiry, single use. `/accept-invite?token=...` sets a password and signs the user in.

### 4.6 Insights (`/insights`) — see Section 5.

### 4.7 Profile and theme
Name, avatar upload (resize with sharp, max 512px), change password, light/dark/system theme. That is the entire settings surface.

---

## 5. INSIGHTS (THE ANALYTICS LAYER)

Insights answer four questions: **What is moving? What is stuck? Who has too much? Are we getting faster?** Every number must be computed from `tasks` and `activity`, never invented. Every chart has a plain-language one-line takeaway under it generated from the data (for example, "7 tasks have been in Review for more than 5 days"), not marketing copy.

### 5.1 Scope and filters
- **Owner:** workspace-wide insights across all projects, with a project filter and a member filter.
- **Staff:** project insights for projects in the workspace, plus a personal "My stats" panel. Staff do not see other members' individual performance comparisons (workload counts on the project view are fine).
- Date range presets: Last 7 days, Last 30 days, This month, Last month, Custom. The range applies to every card and chart on the page and is stored in the URL.

### 5.2 Summary cards (top row)
1. **Open tasks** (not in a `done` column, not archived).
2. **Completed** in range (by `completedAt`), with change vs the previous period of equal length.
3. **Overdue** (due date passed, not done), clickable to a filtered list.
4. **Average cycle time**: median days from first move out of Todo to `completedAt`, for tasks completed in range.
5. **On-time rate**: share of completed tasks with a due date that were completed on or before it. Hide the card if fewer than 5 qualifying tasks.

### 5.3 Charts and tables
1. **Throughput**: tasks completed per day or week (bar chart), switchable.
2. **Burn-up**: cumulative created vs cumulative completed over the range (line chart). The gap is the backlog.
3. **Status distribution**: tasks per column across selected projects (stacked horizontal bar per project).
4. **Workload by member**: open tasks per member, split by priority. Flags any member whose open count is more than 1.5x the team average with a plain "High load" label.
5. **Stuck work**: table of tasks that have not changed column or received an update in 5 days (threshold fixed at 5 for now), sorted by days idle, with assignee and one-click open.
6. **Due soon / overdue**: next 14 days of due dates as a simple grouped list.
7. **Priority mix**: open tasks by priority (small donut or bars).
8. **Project health table** (one row per project): open, done in range, overdue, stuck, and a simple status of `On track` / `At risk` / `Behind` using fixed documented rules (for example, Behind = more than 25% of open tasks overdue; At risk = more than 10% overdue or more than 3 stuck). Record the exact rules in `DECISIONS.md` and show them in a small "How this is calculated" popover.
9. **Activity feed** (latest 50 events, filterable by project and member).

### 5.4 My stats (every user)
Completed this week / month, open assigned, overdue, average cycle time, and a 12-week completed-tasks sparkline.

### 5.5 Rules
- All insight queries run in SQL (aggregations), not by loading rows into JS. Add the indexes they need. Each page load must stay under 300 ms on a seed of 5 projects and 2,000 tasks.
- Charts are lazy-loaded (`next/dynamic`) and server-computed data is passed in as plain JSON.
- Empty states for ranges with no data: "No completed tasks in this range."
- **CSV export** on the stuck-work table, project health table and per-member workload (Owner only for per-member data). UTF-8 with BOM; filename `insights-<report>-YYYY-MM-DD.csv`.

---

## 6. NOTIFICATIONS

In-app only at launch (bell with unread count and a simple list). Triggers: assigned to you, a task you are assigned to gets an update, a task you created is moved to Done, due date is tomorrow (daily job), you are invited. Optional email for assignment and invite, behind an `EmailNotifier` interface with a console fallback. A "Mark all read" action. No per-event preference matrix; one toggle: "Email me about assignments."

---

## 7. REALTIME

No WebSockets. Poll the active board and open task drawer every 10 seconds with TanStack Query (`refetchInterval`, paused when the tab is hidden), plus refetch on window focus. Your own actions are optimistic and never wait for the server. Conflicts: last write wins; position changes use fractional indexing so two people reordering do not corrupt each other.

---

## 8. DESIGN SYSTEM

- Tokens as CSS variables in one file (`--brand`, `--surface`, `--muted`, `--border`, `--danger`, `--success`, `--warning`) so the palette is swappable in minutes. Default: near-white surfaces, near-black text, one solid brand colour (a deep blue or green; no purple), status colours only for status. Light and dark themes.
- 1px borders instead of shadows, 6-8px radius used consistently, an 4px spacing scale.
- Typography: Inter (or the system UI stack), clear hierarchy, tabular numbers in tables and stats.
- Cards are compact: board cards no taller than needed. Dense but never cramped.
- Accessibility: semantic HTML, focus rings, keyboard-navigable menus, drawer, palette and drag, WCAG AA contrast, `prefers-reduced-motion` respected.
- Responsive: mobile-first. On mobile the board scrolls horizontally with snap, the drawer becomes a full-screen sheet, the sidebar becomes a drawer. Test at 375, 768, 1280 and 1440 px.
- Skeletons for board, list and insights. Toasts for actions with Undo where it makes sense (move, archive, delete). Friendly 404 and error pages.

### Keyboard shortcuts
`C` new task (in current project), `/` focus search, `Cmd/Ctrl+K` palette, `G` then `B` board, `G` then `M` My Work, `G` then `I` insights, `Esc` close drawer, `?` shortcut cheat sheet.

---

## 9. SECURITY AND PERFORMANCE

- Server-side authorisation on every action through `can()`. Zod validation on all input. Hashed tokens, secure cookies, rate limiting on login, reset and invite endpoints, generic auth error messages.
- Every query is scoped by workspace id so one workspace can never read another's data. Cover this with tests.
- Image upload limited by type and size.
- Optimistic UI for every mutation; no full-page reloads for normal actions. Avoid client-side waterfalls: load board data in one server query (columns, tasks, assignees, labels, update counts).
- Paginate or virtualise any list that can exceed 200 rows (list view, activity feed, My Work).

---

## 10. SEED DATA (`npm run seed`)

- Workspace "Acme Studio" with 1 Owner (from env: `SEED_OWNER_NAME`, `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`) and 4 Staff.
- 5 projects with realistic names and keys, each with the 4 default columns and 3-5 labels.
- About 300 tasks over the last 90 days, with realistic distribution: varied priorities, some unassigned, some overdue, some stuck for more than 5 days, and a spread of `completedAt` dates so every insight chart has meaningful data.
- Work updates on roughly half the tasks, written like real short updates ("API done, waiting on design for the empty state"), varied authors and lengths.
- A matching activity history, so the feed and cycle time calculations work.

---

## 11. BUILD PHASES

After each phase: lint, typecheck, tests and build must pass; update `PROGRESS.md`; commit.

1. **Foundation:** scaffold Next.js + TS + Tailwind, Drizzle schema and migrations, theme tokens, light/dark, app shell, `can()` helper, env handling, utilities with unit tests.
2. **Auth and members:** Auth.js sign-in, owner seed, invite + accept-invite, password reset, remove/restore access, workspace scoping on all queries, tests for cross-workspace isolation and permissions.
3. **Projects and board:** project CRUD, columns, tasks, board view with inline add, drag and drop with fractional ordering, optimistic updates, filters in the URL, List view.
4. **Task drawer:** all fields with autosave, labels, assignee picker, due date, priority, markdown description, URL-addressable drawer, archive/delete.
5. **Updates and activity:** work-update feed, activity writes in every mutating action, timeline in the drawer, workspace/project activity feed.
6. **My Work, team page, notifications:** My Work groups, team page with workload counts, in-app notifications, daily due-soon job (`npm run cron:due-soon` plus a protected `/api/cron/due-soon` route; document scheduling).
7. **Insights:** SQL aggregations, summary cards, all charts and tables from Section 5, date range and filters in the URL, My stats, CSV exports, "How this is calculated" popover, performance check against the seed.
8. **Polish:** command palette, keyboard shortcuts and cheat sheet, skeletons, empty and error states, toasts with Undo, responsive pass at all breakpoints, accessibility pass, bundle-size check against the target.
9. **Seed and tests:** full seed, Playwright e2e smoke tests (see below).
10. **Final QA:** everything clean, all warnings fixed, `README.md` finalised (setup, env vars, scripts, deployment notes for a Node host with a persistent disk, cron setup), `PROGRESS.md` marked complete.

### E2E smoke tests
- Owner signs in, creates a project, adds a task inline, drags it across columns, and the board persists after reload.
- Staff opens a task, assigns it to another member, posts a work update; the assignee sees a notification.
- Owner invites a staff member; the invite link sets a password and signs them in; the Owner removes their access and they can no longer sign in.
- Staff cannot reach `/team` invite actions or other members' performance comparisons (server returns 403).
- A user from workspace A cannot read any data from workspace B.
- Moving a task into Done sets `completedAt` and it appears in Insights throughput; moving it back clears it.
- Insights date range changes update every card and chart and survive a page reload via the URL.

---

## 12. ENVIRONMENT VARIABLES (`.env.example`)

```
DATABASE_URL=file:./data/app.db
AUTH_SECRET=
APP_URL=http://localhost:3000
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Workspace <no-reply@example.com>"
SEED_OWNER_NAME=Workspace Owner
SEED_OWNER_EMAIL=owner@example.com
SEED_OWNER_PASSWORD=ChangeMe123!
CRON_SECRET=
UPLOAD_DIR=./uploads
```

---

## 13. DEFINITION OF DONE

- Every feature in this document works end to end with seeded data.
- One Owner and Staff permissions are enforced server-side and verified by tests; workspace isolation is verified by tests.
- Board interactions (add, drag, assign, update) feel instant through optimistic updates.
- Insights numbers match the underlying data exactly (verified by unit tests on the aggregation queries) and render in under 300 ms on the seed.
- No banned scope, no banned visual patterns, no placeholder text.
- Responsive and accessible at all tested breakpoints.
- `npm run lint`, `typecheck`, `test`, `test:e2e` and `build` all pass.
- `README.md`, `DECISIONS.md` and `PROGRESS.md` are complete and accurate.

**Start now with Phase 1. Do not ask for confirmation.**
