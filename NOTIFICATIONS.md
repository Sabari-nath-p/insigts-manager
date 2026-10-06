# Notifications

Workspace alerts for everyone, free to run (no paid service, no third-party account).

## What people get
| Event | Who is told | Where |
|---|---|---|
| Someone starts work (check-in) | Every other active employee | Bell + browser alert |
| Someone pauses for a break | Every other active employee | Bell + browser alert |
| Someone is back from a break | Every other active employee | Bell + browser alert |
| 10:00 login reminder | Anyone expected to work today who has not checked in | Bell + browser alert |
| Task assigned to you, update on your task, your task completed | The assignee / creator | Projects bell + browser alert |
| Task due today, task due tomorrow (sent at 10:00) | The assignee | Projects bell + browser alert |

Not announced: check-out, meetings, leave, and work-log updates. The person who acted is never notified about their own action, and the same person repeating the same action within a minute is announced once.

"Expected to work today" follows the same rules the nightly auto-leave job uses: the person's working days (flexible employees: Monday to Friday), the second-Saturday setting, department holidays, and approved leave. Times use `APP_TIMEZONE` (default Asia/Kolkata).

## How browser alerts work (and why they are free)
Each person opens the bell and switches on "Desktop alerts on this device". The browser asks permission once. After that the server sends alerts through the standard Web Push system built into Chrome, Edge, Firefox and Safari, so they arrive even when the site is closed. No SMS, email or paid push provider is involved.

- It needs HTTPS in production. `localhost` works for development.
- iPhone and iPad: the site must first be added to the home screen (iOS 16.4 or later).
- Alerts are per device. Someone who uses two computers switches it on in each.
- If a person denies permission, the browser blocks the prompt; they have to allow it in the address bar, and the menu says so.

## Setup (once)
1. Generate keys: `cd backend && npm run notifications:keys`.
2. Put them in the `.env` next to `docker-compose.yml`:
   ```
   VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   VAPID_SUBJECT=mailto:you@yourcompany.com
   ```
   Keep the private key secret and do not change the pair later, or every device must switch alerts on again.
3. Create the two new tables: `cd backend && npx prisma migrate deploy` (or run `backend/prisma/migrations/20261006000000_notifications/migration.sql`; it only creates new tables).
4. Rebuild and restart backend and frontend.

Without keys everything still works except browser alerts; the bell keeps filling, and the menu says alerts are not set up.

## Checking it
- Super admin: `POST /api/notifications/cron/login-reminder` runs today's reminder now and returns how many people it reached.
- Any user: "Send a test alert" appears under the switch once alerts are on.
- Projects due-date alerts: `POST /api/pm/cron/due-soon` (admin).
- Tests: `npx jest notifications` (add `PM_TEST_DATABASE_URL=...` for the push delivery test against a stand-in push service), and `npm run test:e2e` in `frontend`.

## Changing what is announced
`backend/src/notifications/presence-events.ts` is the single place that decides which status changes are announced and the wording. The reminder hour is the `scheduleDaily(..., 10, 0, ...)` call in `login-reminder.job.ts`.
