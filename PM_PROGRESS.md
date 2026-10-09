# Project management: progress

Status: built and tested end to end against a disposable MySQL. Not yet run against your real database or deployed.

## Done
- **Phase 1, foundation and API:** 9 new `pm_*` tables (new migration, `CREATE TABLE` only), `can()` permission map, access guard, projects, columns, labels, tasks, move with fractional ordering, updates, activity, notifications, My Work, team access, insights SQL, CSV export, daily due-soon job.
- **Phases 2-6, app:** shell with sidebar, search palette, notification bell, shortcuts; project list; board with filters in the URL, drag and drop (pointer and keyboard), inline add, optimistic updates, List view; task drawer with autosave, labels, markdown, updates and activity; My Work; Team with admin access control.
- **Phase 7, insights:** five summary cards, throughput, burn-up, status by project, priority mix, workload (admin only), stuck work, due soon, project health with "How this is calculated", My stats, activity feed, three CSV exports, date range in the URL.
- **Phase 8, polish:** skeletons, 404 and error pages, toasts with Undo, responsive at 375, 768 and 1440 px (checked from screenshots).
- **Phase 9, tests:** jest unit tests, SQL tests against MySQL, Playwright smoke tests.

## Verification (run on this machine)
- Backend `tsc --noEmit`: clean. Jest: 26 tests passing (19 unit, 7 SQL checks against MySQL with hand-computed numbers).
- Both migrations apply in order to an empty MySQL 8 database.
- API smoke script: 47 of 48 checks passed at first; the one miss was the test reading a BOM through `fetch().text()`. Raw bytes confirm the CSV starts with the BOM.
- Insights on 2,000 seeded tasks: 40-90 ms per request (target 300 ms). Board load 30-40 ms.
- Frontend `tsc --noEmit`, `next lint`, `next build`: clean. Existing routes still build.
- Playwright: 7 tests, 8 consecutive full-suite runs all passed. Keyboard drag test: 15 of 15 in isolation.
- Bugs found by running it and fixed: polling intervals referenced `document` during server rendering; stuck and due-soon takeaways were capped by a SQL `LIMIT`; seed data was unrealistically overdue.

## Self-check against the design rules
No gradients, glow or blur; no shadows (1px borders); radius at most 8px; no emoji, hype words, exclamation marks or lorem ipsum in the new files (grep). Motion is limited to the drawer and dialogs, drag, hover, toasts and skeleton pulse. Empty states say what to do next.

## Known gaps
- Board page first-load JS is 166 kB against a 150 kB target. 87.6 kB of that is the existing app's shared baseline. Dialogs and the drawer are already lazy-loaded.
- Backend has no ESLint config (pre-existing), so there is no backend lint run.
- Email notifications, invites, password reset and avatars are not built. Users, passwords and profiles belong to the existing app.
- Not exercised: Docker image build, and the migration against a database that already holds your real attendance and CRM data.
- Playwright tests need a disposable database; do not point them at a real one.
