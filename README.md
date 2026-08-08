# Insights — Company Management Tool

A company management tool (HRMS-style). Current scope: account provisioning by a super
admin, JWT auth, daily attendance (check-in/check-out), leave requests (paid/medical/unpaid)
with an admin review flow, and live presence status.

## Stack

| Layer    | Tech |
|----------|------|
| Backend  | NestJS, TypeScript, TypeORM, MySQL, JWT (Passport), Swagger |
| Frontend | Next.js (App Router), TypeScript, CSS Modules, Server-Side Rendering |
| Infra    | Docker + Docker Compose |

## Project structure

```
Insights/
├── backend/           NestJS API
│   └── src/
│       ├── auth/         JWT + local (email/password) login, roles guard
│       ├── users/        User entity, admin CRUD, self status, team status, overview
│       ├── attendance/   Daily check-in / check-out
│       ├── leaves/       Leave requests + admin review
│       ├── health/       Health check endpoint
│       └── config/       Environment configuration
├── frontend/          Next.js app (App Router, SSR)
│   └── src/
│       ├── app/           pages, layouts, and API route handlers (proxy mutations to the API)
│       ├── components/    shared shell/nav + stylesheet used across authenticated pages
│       └── lib/           API base URL, fetch wrapper, session/JWT helpers
└── docker-compose.yml  MySQL + backend + frontend
```

## Running everything with Docker (recommended)

```bash
cd Insights
cp .env.example .env      # adjust secrets as needed
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Swagger docs: http://localhost:3001/api/docs
- MySQL: localhost:3307 (host port, configurable via `MYSQL_HOST_PORT`; container-to-container traffic still uses 3306)

The frontend performs actual SSR: server components call the backend from inside the
Docker network on every request (`INTERNAL_API_URL=http://backend:3001/api`), while the
browser talks to the backend via `NEXT_PUBLIC_API_URL=http://localhost:3001/api`.

## Running locally without Docker

### Backend

```bash
cd backend
cp .env.example .env      # point DB_HOST at your local MySQL, e.g. localhost
npm install
npm run start:dev         # http://localhost:3001/api, docs at /api/docs
```

Requires a running MySQL instance matching the credentials in `.env`. `DB_SYNCHRONIZE=true`
(the default) auto-creates/updates tables from entities — turn it off once real migrations
are introduced.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                # http://localhost:3000
```

## Accounts & roles

There is no public sign-up. The **first super admin** is bootstrapped automatically on
first startup from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME` /
`SUPER_ADMIN_PHONE` (see `.env.example`) — it's a no-op on every later startup, once any
super admin already exists. From there, a super admin creates every other account
(`POST /api/users`), including additional super admins, via **Employees → New account** in
the UI.

Two roles: `super_admin` and `employee`. Every account has a working type:

- **Fixed** — `fixedHoursPerDay`, `fixedStartTime`/`fixedEndTime`, and `workingDays`
  (Mon–Sun selection).
- **Flexible** — a flat `flexibleMonthlyHours` target, prorated over the requested date
  range for the overview calculation.

Every account also carries `currentSalary`, `paidLeaveQuota`, and `medicalLeaveQuota`
(annual allotments; "remaining" is computed as quota minus approved days taken).

## Authentication flow

- `POST /api/auth/login` — validates credentials, returns a JWT + user profile.
- `GET /api/auth/me` — returns the current user (requires `Authorization: Bearer <token>`).

On the frontend, `/login` posts to a Next.js route handler (`/api/auth/login`) which calls
the backend and stores the JWT in an **httpOnly cookie**. SSR pages read that cookie
server-side to call the backend and render fully on the server; client-side mutations
(check-in, apply leave, create user, etc.) go through small Next.js route handlers under
`/api/...` that read the same cookie and forward the request with the Bearer token, since
an httpOnly cookie is deliberately unreadable from client JS.

## What each module does

**Users** (`/api/users`, super admin only unless noted)
- `POST /` — create a super admin or employee account with schedule, salary and leave quotas.
- `GET /` — list all accounts. `GET /:id` — full detail. `GET /:id/overview` — worked hours,
  expected hours, hours not worked, and leave breakdown for a date range (defaults to
  month-to-date).
- `GET /me/overview` — the same overview for your own account (any authenticated user).
- `PATCH /me/status` — set your live presence (`working`, `in_meeting`, `on_break`,
  `on_leave`, `offline`). `GET /team/status` — see everyone's current status.

**Attendance** (`/api/attendance`, any authenticated user)
- `POST /check-in`, `POST /check-out` — one pair per calendar day.
- `GET /me/today`, `GET /me` — today's record / full history.

**Leaves** (`/api/leaves`)
- `POST /` — apply for `paid`, `medical`, or `unpaid` leave (any authenticated user).
- `GET /me` — your own requests.
- `GET /` and `PATCH /:id/review` (super admin only) — list all requests and decide them.
  **Approve** sanctions the leave as requested. **Reject** on a paid/medical request doesn't
  deny it outright — it's auto-converted to `unpaid` and sanctioned as such; rejecting an
  already-unpaid request is final.

## What's next

Payroll, org-chart/reporting-lines, and any further modules will be layered on top per the
next round of specs. No automated test suite yet by request — functionality was verified
end-to-end manually (curl + the running Docker stack) rather than with unit/e2e tests.
