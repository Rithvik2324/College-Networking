# IntentLink Campus

IntentLink Campus is a campus collaboration application for discovering students, forming focused teams, sharing projects, and coordinating tasks.

The active app is the Next.js 16 + React 19 + TypeScript project in [`app/`](app/). The original static HTML/CSS/JavaScript prototype remains at the repository root for reference and still uses browser-local demo state; use the Next.js app for authentication and database-backed workflows.

## Run Locally

From PowerShell:

```powershell
Set-Location .\app
npm install
Copy-Item .env.example .env
```

Configure Firebase Admin credentials following [`app/README.md`](app/README.md), then run:

```powershell
npm run firebase:check
npm run dev
```

Open http://localhost:3000. All active app data is stored in Cloud Firestore in `intentlink`; the original SQLite database is retained only for recovery/import. Do not overwrite existing environment files. Keep credentials and database backups out of version control. Replace the `AUTH_SECRET` placeholder with a random secret before deploying. The existing Firestore project is already migrated; do not reinitialize or reseed it.

Demo accounts: `aarav@college.edu` / `demo123`, `saanvi@college.edu` / `demo123`, and `admin@college.edu` / `admin123`.

## Current Product Surface

- Student signup, login, logout, HTTP-only sessions, multi-step resumable onboarding, profile editing, and settings.
- Student discovery with filters, public profile details, and persisted collaboration requests.
- Communities/teams with invitations, membership, server-enforced six-member capacity, team messages, and task workspaces.
- Project discovery/creation, join requests, owner review, direct messages, and notifications.
- A personalized dashboard and responsive mobile navigation.

## Verification And Limits

See [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) for current test results and unfinished work. Firestore is the active database, with server-only Security Rules and the app's existing bcrypt/JWT login. Isolated Firestore transaction tests and HTTP workflow checks are available. Email verification, password reset, hosted image upload, realtime sockets, and production deployment configuration remain incomplete. Direct messages use persisted polling rather than realtime delivery.
