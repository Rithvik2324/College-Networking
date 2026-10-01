# IntentLink Campus Implementation Status

Last updated: 2026-10-01

## Current baseline

The active application is the Next.js 16 App Router project under `app/`. The original static HTML/CSS/JavaScript prototype remains at the repository root, including its existing user edits. It is preserved as a legacy reference; the active app no longer reads its JSON store at runtime.

The Next.js app now has public landing/discovery/community/About pages; login, registration, resumable onboarding, dashboard, teams, projects, student profiles, tasks, messages, notifications, profile, and settings pages; and Prisma-backed route handlers for their main operations. Passwords use bcryptjs hashes and HTTP-only JWT cookies. SQLite is the local relational source of truth; `app/data/store.json` remains only as an import source for the idempotent seed.

## Verified behavior

- The final Next.js 16 production build and `npm run typecheck` passed after the database-backed routes, security checks, and product pages were added.
- `npm run lint` exits successfully with five `react-hooks/exhaustive-deps` warnings on deferred data-load effects; there are no lint errors.
- `npm test` passes two Node built-in tests covering matching ranking and password-hash redaction.
- `npm audit` reports 0 vulnerabilities after overriding the two vulnerable Prisma config transitive packages with patched versions.
- Prisma 6.19 schema validation and two SQLite migrations passed. The seed imported the five original accounts, communities, tasks, messages, and notifications and added two sample projects.
- The seeded `aarav@college.edu` / `demo123` and `saanvi@college.edu` / `demo123` accounts authenticated successfully against SQLite.
- Journey A passed in the browser: register, complete all three onboarding steps, reach the dashboard, refresh, and confirm the session/profile persist.
- Journey B passed in the browser: log out, log in again, edit profile, refresh, and confirm the updated bio and normalized skills persist.
- Journey C passed in the browser: discover Saanvi, send a collaboration request, accept it as Saanvi, create a direct conversation, and send/view a persisted message.
- Journey D was exercised across browser UI and same-origin API calls: create a team in the UI, invite/accept members, create/update a task, and verify the task board reflects it. The six-member cap was reached and a further invite returned `409`. Project creation and owner-reviewed join acceptance also returned successful persisted records.
- Journey E checks passed for unauthenticated task access (`401`), protected task-page redirection, nonmember task mutation (`403`), and self-scoped profile updates (a supplied `userId` did not change the other student's record). These checks still need repeatable automated regression tests.
- Account notification preferences were exercised: disabling alerts prevented a new direct-message notification; the preference was restored afterward.
- Mobile viewport validation at 390px showed no horizontal overflow; the mobile navigation opened and closed.
- The dev server is running at `http://localhost:3000`. `app/prisma/dev.db` is ignored; migration files are kept under `app/prisma/migrations/`.

## Gaps against product requirements

- Automated coverage currently contains two domain/privacy unit tests only. API integration and browser acceptance journeys remain manual and need repeatable regression tests.
- SQLite is suitable for this local demo and a single-instance host with durable disk, not a serverless or multi-instance deployment. A PostgreSQL provider/migration has not been configured.
- College email format is validated, but email ownership is not verified. Password reset, email verification, rate limiting, moderation/admin screens, and deployment observability are not implemented.
- Avatars accept a URL but are not uploaded or stored by a media service.
- Direct messages are persisted and poll every six seconds while open; there is no websocket/realtime delivery.
- The preserved root static prototype still uses its own localStorage data and is not connected to the Next.js account/database.
- Next.js still warns that an unrelated lockfile in the parent user directory is outside the workspace Git root; the app's own lockfile and build are used correctly.
- ESLint emits five exhaustive-dependency warnings on deferred initial fetch effects; all other lint checks pass.

## Implementation tracking

- [x] Audit the legacy prototype and active Next.js routes, handlers, styles, and data layer.
- [x] Add and maintain this implementation ledger.
- [x] Replace deprecated middleware convention with Next.js 16 `proxy.ts`; page protection and API authorization are separate.
- [x] Add normalized relational entities, two SQLite migrations, and idempotent demo-data import.
- [x] Add app-scoped env examples, database scripts, and fail-closed production auth secret handling.
- [x] Redesign public landing/navigation and shared responsive product shell.
- [x] Implement signup/login/logout, resumable onboarding, and the database-backed dashboard.
- [x] Implement student search/profile discovery and persistent collaboration request decisions.
- [x] Implement projects, teams/communities, invitations, permissions, and server-enforced six-member cap.
- [x] Implement task creation/assignment/status/activity, persisted messages, and notifications.
- [x] Implement self-scoped profile editing and account/password/notification settings.
- [x] Add focused matching and public-profile privacy unit tests.
- [ ] Add repeatable API/E2E tests for auth, cross-user scope, six-member capacity, and user journeys A-E.
- [ ] Remove remaining lint warnings and run a full keyboard/contrast/mobile audit across every route.
- [ ] Configure production Postgres, email verification/reset, media storage, and deployment-specific environment/monitoring.

## Next concrete task

Add automated regression coverage for authorization, six-member capacity, registration/onboarding, and the acceptance journeys. Then plan a provider-specific migration from local SQLite to managed PostgreSQL before multi-instance deployment.
