# Project management: progress

## Phase 1: foundation and API (backend) — done
- `pm_*` tables (9) added as a new migration; no changes to existing tables.
- `backend/src/projects/`: permissions (`can()`), access guard, projects, columns, labels, tasks, move, updates, activity, notifications, my work, team access, insights (SQL), CSV export, daily due-soon job.
- Unit tests (jest): permissions, health rules, high-load flag, date ranges, series helpers, fractional positions, CSV. 19 passing.
- Not verified: raw SQL in `insights.service.ts`, `tasks.service.ts` (`myWork`, `notifyDueSoon`) and `projects.service.ts` (`list`). No MySQL was available (Docker daemon not running), so these have only been type-checked.

## Next
- Phase 2: frontend shell, auth reuse, team page.
