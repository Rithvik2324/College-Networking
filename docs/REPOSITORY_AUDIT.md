# Repository Audit

Updated: 2026-10-01

## Current Architecture

The repository intentionally contains two product layers:

- `app/` is the active Next.js 16 App Router application using React 19, TypeScript, Tailwind CSS v4, Prisma 6, SQLite, Zod, bcryptjs, and `jose` session tokens.
- The repository root retains the original HTML/CSS/JavaScript prototype (`index.html`, `features.html`, `match.html`, `workspace.html`, `rules.html`, `launch.html`, `styles.css`, and `script.js`). It still runs independently and persists its demo data in browser `localStorage`.

The root prototype is preserved and is not wired to the Next.js database. The app README and root README describe which layer to run.

## Active App Surface

Public routes include the landing page, About, Discover, Communities, Projects, Features, Match, Rules, and Launch. Signed-in product routes include the dashboard, onboarding, student profiles, teams, community workspaces, projects, task board, direct messages, notifications, profile, and settings.

Route handlers cover:

- Signup/login/logout/session and self-scoped profile/settings operations.
- Student search/profile display and collaboration-request decisions.
- Community/team creation, membership, invitations, and private team details.
- Project browse/create/edit and join-request review.
- Task create/update, membership checks, assignees, due dates, history, and notifications.
- Direct and team conversations, persisted messages, and notification read state.

Authentication uses bcryptjs password hashes and seven-day HTTP-only JWT cookies. Next.js 16 `proxy.ts` redirects protected page requests; each API handler also checks the session and applies resource-level authorization.

## Persistence

`app/prisma/schema.prisma` defines users, normalized skills/interests, communities and members, invitations, collaboration requests, projects and members, project join requests, tasks and task history, conversations/messages, and notifications. Migrations live under `app/prisma/migrations/`; `app/prisma/seed.mjs` imports the retained JSON demonstration data and adds sample projects.

The current database provider is SQLite. `app/prisma/dev.db` is an ignored local development file. This gives durable local persistence, but deployment requires durable disk on a single instance. No PostgreSQL provider, managed database, email service, or media storage provider is configured.

## Existing Limitations

- Two automated Node unit tests cover matching and password-hash redaction. API integration and browser acceptance journeys have been checked manually but do not yet have repeatable automated coverage.
- College email syntax is checked, but addresses are not verified. Password reset, rate limiting, moderation/admin pages, and production monitoring are not implemented.
- Avatar support is a URL field, not file upload.
- Messaging is persisted and polls while the conversation is open; delivery is not realtime.
- The legacy static prototype remains localStorage-only and has no shared accounts or server data.
- ESLint currently completes with five exhaustive-dependency warnings on deferred initial fetch effects.
- The final `npm audit` run reported zero vulnerabilities after pinning patched Prisma config transitive dependencies.

See `IMPLEMENTATION_STATUS.md` for current verified journeys, command results, and the next release-hardening task.