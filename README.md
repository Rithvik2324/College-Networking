# IntentLink Campus

IntentLink Campus is a campus collaboration application for discovering students, forming focused teams, sharing projects, and coordinating tasks.

The active app is the Next.js 16 + React 19 + TypeScript project in [`app/`](app/). The original static HTML/CSS/JavaScript prototype remains at the repository root for reference and still uses browser-local demo state; use the Next.js app for authentication and database-backed workflows.

## Run Locally

From PowerShell:

```powershell
Set-Location .\app
npm install
Copy-Item .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. For local development, the example SQLite URL uses `app/prisma/dev.db`. Keep `.env` and the database file out of version control. Replace the `AUTH_SECRET` placeholder with a random secret before deploying.

Demo accounts: `aarav@college.edu` / `demo123`, `saanvi@college.edu` / `demo123`, and `admin@college.edu` / `admin123`.

## Current Product Surface

- Student signup, login, logout, HTTP-only sessions, multi-step resumable onboarding, profile editing, and settings.
- Student discovery with filters, public profile details, and persisted collaboration requests.
- Communities/teams with invitations, membership, server-enforced six-member capacity, team messages, and task workspaces.
- Project discovery/creation, join requests, owner review, direct messages, and notifications.
- A personalized dashboard and responsive mobile navigation.

## Verification And Limits

See [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) for current test results and unfinished work. The local relational database is SQLite; deployment requires durable storage for the SQLite file on a single-instance host or a planned migration to managed PostgreSQL. Email verification, password reset, hosted image upload, realtime sockets, production deployment configuration, and automated test coverage remain incomplete. Direct messages use persisted polling rather than realtime delivery.
