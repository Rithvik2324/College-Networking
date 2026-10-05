# Repository Audit

Updated: 2026-10-05

## Architecture

- `app/` is the active Next.js 16 App Router application using React 19, TypeScript, Tailwind CSS v4, MongoDB's Node.js driver, Zod, bcryptjs, and `jose` session tokens.
- The repository root retains the original HTML/CSS/JavaScript prototype. It runs independently and stores demo state in browser `localStorage`.
- `app/lib/database-store.ts` provides the data interface used by the API routes. MongoDB documents retain numeric record IDs and composite membership keys.

## Product surface

The app includes signup/login/logout/session routes, student discovery and profiles, collaboration requests, teams and invitations, projects and join requests, task assignments/activity, conversations/messages, notifications, onboarding, profile editing, and settings. Protected APIs validate sessions and resource access.

## Database status

MongoDB Atlas is the active target, configured through `MONGODB_URI`. The supplied Atlas cluster is reachable but rejected the supplied database credentials, so live registration and database writes are not yet confirmed. The prior SQLite database is retained at `app/legacy-data/legacy-dev.db`; no cloud data has been migrated.

## Verification and limits

- `npm run typecheck` passes.
- `npm run build` passes.
- `npm run db:check` reaches Atlas when tested through its resolved host list but currently returns an authentication failure.
- Email ownership verification, password reset, rate limiting, hosted image upload, realtime messaging, moderation/admin pages, and production monitoring remain incomplete.
