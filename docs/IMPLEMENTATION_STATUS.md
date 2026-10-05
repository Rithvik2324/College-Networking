# IntentLink Campus Implementation Status

Last updated: 2026-10-05

## Current baseline

The active application is the Next.js 16 App Router project under `app/`. The root HTML/CSS/JavaScript prototype remains as a separate legacy reference and still uses browser-local demo state.

The Next.js app includes registration, login, sessions, onboarding, student discovery, profiles, teams, projects, tasks, messages, notifications, and settings. Passwords use bcryptjs hashes and sessions use HTTP-only JWT cookies. The active data layer now uses the official MongoDB Node.js driver and preserves the existing numeric IDs and collection interface.

## MongoDB Atlas status

- The old Firebase, Supabase, and Prisma app integrations and their configuration have been removed.
- Local configuration now uses a single `MONGODB_URI` setting in `app/.env.local`; the URI is excluded from version control.
- The provided Atlas cluster resolves and is reachable, but Atlas rejected the supplied database username/password with an authentication failure. The app cannot connect until a valid Atlas database user credential is set.
- Existing cloud database records were not copied. The old SQLite file is preserved at `app/legacy-data/legacy-dev.db`.
- `npm run typecheck` and `npm run build` pass with the MongoDB adapter.

## Remaining product gaps

- Atlas credentials and the Atlas IP access list must be configured for local development and Vercel.
- The previous cloud data has not been migrated into Atlas.
- Email verification, password reset, hosted image upload, realtime sockets, and production monitoring remain incomplete.
- Direct messages persist and poll while open; they are not delivered over realtime sockets.
- The root static prototype remains independent from the account/database-backed Next.js app.
