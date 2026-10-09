# Notifications

Workspace alerts for everyone. Browser alerts are delivered by Firebase Cloud Messaging (FCM), which is free and needs a Google/Firebase account.

## What people get
| Event | Who is told | Where |
|---|---|---|
| Someone starts work (check-in) | Every other active employee | Bell + browser alert |
| Someone pauses for a break | Every other active employee | Bell + browser alert |
| Someone is back from a break | Every other active employee | Bell + browser alert |
| 10:00 login reminder | Anyone expected to work today who has not checked in | Bell + browser alert |
| Leave approved (including a paid request converted to unpaid) | Every other active employee, plus a confirmation to the person | Bell + browser alert |
| Added to a task (also as a second or third assignee), update on your task, your task completed | Each assignee / the creator | Projects bell + browser alert |
| Task due today, task due tomorrow (sent at 10:00) | The assignee | Projects bell + browser alert |

Not announced: check-out, meetings, leave requests that are only applied for or are rejected, and work-log updates. The person who acted is never notified about their own action, and the same person repeating the same action within a minute is announced once.

"Expected to work today" follows the same rules the nightly auto-leave job uses: the person's working days (flexible employees: Monday to Friday), the second-Saturday setting, department holidays, and approved leave. Times use `APP_TIMEZONE` (default Asia/Kolkata).

## How browser alerts work
Each person opens the bell and switches on "Desktop alerts on this device". The browser asks permission once and Firebase gives that browser a private token. The server sends alerts to those tokens through Firebase, so they arrive even when the site is closed.

- It needs HTTPS in production. `localhost` works for development.
- iPhone and iPad: the site must first be added to the home screen (iOS 16.4 or later).
- Alerts are per device. Someone who uses two computers switches it on in each.
- If a person denies permission, the browser blocks the prompt; they have to allow it in the address bar, and the menu says so.
- The bell inside the site works without Firebase. Only the pop-up alerts need it.

## Setup (once)

### 1. Create the Firebase project (about 5 minutes, in the browser)
1. Go to https://console.firebase.google.com and sign in with a Google account the company controls. Click **Add project**, name it, and finish (Google Analytics is not needed).
2. **Web app settings.** In the project, click the **`</>` (Web)** icon to add a web app, give it a nickname, and register it. You will see a block of settings. Copy these four values:
   - `apiKey` -> `FIREBASE_WEB_API_KEY`
   - `projectId` -> `FIREBASE_PROJECT_ID`
   - `messagingSenderId` -> `FIREBASE_MESSAGING_SENDER_ID`
   - `appId` -> `FIREBASE_APP_ID`
3. **Web push key.** Go to **Project settings -> Cloud Messaging -> Web Push certificates** and click **Generate key pair**. Copy the key -> `FIREBASE_VAPID_KEY`.
4. **Service account key (this one is secret).** Go to **Project settings -> Service accounts -> Generate new private key**. A `.json` file downloads. Its whole contents, put on one line, is `FIREBASE_SERVICE_ACCOUNT_JSON`. Anyone who has this file can send alerts as your project, so keep it out of git and out of chat.
5. Make sure **Cloud Messaging API (V1)** shows as enabled in Project settings -> Cloud Messaging.

### 2. Give the settings to the backend
Add these to the `.env` next to `docker-compose.yml` (or the backend's own `.env` if you run it without Docker):
```
FIREBASE_WEB_API_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
FIREBASE_VAPID_KEY=...
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...", ... }
```
For the service account you can instead save the file on the server and set `FIREBASE_SERVICE_ACCOUNT_FILE=/path/to/key.json`.

Only the backend needs these. The website reads the public ones from the backend, so there is nothing to put in the frontend `.env`.

### 3. Create the new table and install packages
- `cd backend && npx prisma migrate deploy` (or run `backend/prisma/migrations/20261009000000_fcm_tokens/migration.sql`; it only creates one new table, `fcm_tokens`).
- `cd backend && npm install && npx prisma generate && npm run build`
- `cd frontend && npm install && npm run build`
- Restart both.

The old `push_subscriptions` table from the previous system is left in place, unused. Nothing is deleted. Devices that turned alerts on before the switch simply need to switch them on again once.

Without the Firebase settings everything still works except pop-up alerts; the bell keeps filling, and the menu says alerts are not set up.

## Checking it
- Any user: open the bell, switch alerts on, press **Send a test alert**.
- Super admin: `POST /api/notifications/cron/login-reminder` runs today's reminder now and returns how many people it reached.
- Projects due-date alerts: `POST /api/pm/cron/due-soon` (admin).
- Tests: `cd backend && npx jest notifications` (add `PM_TEST_DATABASE_URL=...` for the token-handling tests), and `npm run test:e2e` in `frontend`.

## Changing what is announced
`backend/src/notifications/presence-events.ts` is the single place that decides which status changes are announced and the wording. The reminder hour is the `scheduleDaily(..., 10, 0, ...)` call in `login-reminder.job.ts`.
