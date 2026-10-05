# IntentLink Campus

IntentLink Campus is a campus collaboration application for discovering students, forming focused teams, sharing projects, and coordinating tasks.

The active app is the Next.js 16 + React 19 + TypeScript project in [`app/`](app/). The original static HTML/CSS/JavaScript prototype remains at the repository root for reference and still uses browser-local demo state; use the Next.js app for authentication and database-backed workflows.

## Run Locally

From PowerShell:

```powershell
Set-Location .\app
npm install
```

Create a MongoDB Atlas database user and allow your local IP in Atlas Network Access. Add `MONGODB_URI` and `AUTH_SECRET` to `app/.env.local` as described in [`app/README.md`](app/README.md). Then run:

```powershell
npm run db:check
npm run dev
```

Open http://localhost:3000. App data is stored in MongoDB Atlas through the MongoDB Node.js driver. Keep the connection string out of version control. Existing Firebase or Supabase data is not imported automatically.

Demo accounts: `aarav@college.edu` / `demo123`, `saanvi@college.edu` / `demo123`, and `admin@college.edu` / `admin123`.

## Current Product Surface

- Student signup, login, logout, HTTP-only sessions, multi-step resumable onboarding, profile editing, and settings.
- Student discovery with filters, public profile details, and persisted collaboration requests.
- Communities/teams with invitations, membership, server-enforced six-member capacity, team messages, and task workspaces.
- Project discovery/creation, join requests, owner review, direct messages, and notifications.
- A personalized dashboard and responsive mobile navigation.

## Verification And Limits

See [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) for implementation notes. MongoDB Atlas is the active database target. Email verification, password reset, hosted image upload, realtime sockets, and production deployment configuration remain incomplete. Direct messages use persisted polling rather than realtime delivery.
