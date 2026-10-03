# IntentLink Campus Implementation Status

Last updated: 2026-10-03

## Current baseline

The active application is the Next.js 16 App Router project under `app/`. The original static HTML/CSS/JavaScript prototype remains at the repository root, including its existing user edits. It is preserved as a legacy reference; the active app no longer reads its JSON store at runtime.

The Next.js app now has public landing/discovery/community/About pages; login, registration, resumable onboarding, dashboard, teams, projects, student profiles, tasks, messages, notifications, profile, and settings pages; and Firestore-backed route handlers for their main operations. Passwords use bcryptjs hashes and HTTP-only JWT cookies. Cloud Firestore in `intentlink` is the source of truth. SQLite and `app/data/store.json` remain offline recovery/import sources only.

## Firestore Migration

- All 25 source records across 14 collections were imported and verified field-for-field, including five users, two communities, two projects, three tasks, and existing memberships, conversations, messages, and notifications.
- A consistent SQLite backup was created before import. No existing SQLite records were deleted or edited.
- Server-only Firestore rules were deployed and verified; the previous rules were backed up locally. API authorization remains enforced by the existing sessions and workspace membership checks.
- Numeric IDs and composite memberships are preserved. Skills/interests are embedded on profiles and projects; user skill levels remain available.
- `_meta/storage` prevents access during an incomplete import. `_counters` allocates new IDs transactionally. No active API or library imports Prisma; its client is development-only offline tooling.
- Isolated live tests cover readiness, rollback, read-your-writes, timestamp conversion, duplicate registration, concurrent capacity, conversation reuse, membership scope, and notification opt-out; temporary collections are removed afterward.
- A repeatable local-server HTTP check is available through `npm run test:workflows`; it removes its temporary accounts and records afterward.
- The production build, typecheck, two domain tests, and eight Firestore integration checks passed. Full lint has zero errors and the five pre-existing hook-dependency warnings.
- HTTP checks passed for registration/login/onboarding, duplicate-email rejection, profile scope, discovery/matching/settings, private-team visibility, invitation decisions, project membership, collaboration acceptance, direct/team messages, task activities, notification opt-out, and unauthorized access.
- Concurrent HTTP joins respected the six-member limit. Owner leave restrictions, freed-slot reuse, and former-member message rejection passed. The migrated demo account authenticated successfully against Firestore.
- Test accounts and records were removed, then `db:verify` confirmed that all 25 original imported records still match SQLite. Numeric-ID counters intentionally remain monotonic after test cleanup.
- The local dev server is available at `http://127.0.0.1:3000`.

## Original Baseline Checks

The checks below describe the original SQLite baseline; see the migration section above for current storage.

## Verified behavior

- The final Next.js 16 production build and `npm run typecheck` passed after the database-backed routes, security checks, and product pages were added.
- `npm run lint` exits successfully with five `react-hooks/exhaustive-deps` warnings on deferred data-load effects; there are no lint errors.
- `npm test` passes two Node built-in tests covering matching ranking and password-hash redaction.
- Current dependency installation reports 11 vulnerabilities (2 moderate, 9 high); dependency remediation is outside the database migration scope.
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

- Browser acceptance automation and broad visual/accessibility coverage remain incomplete; Firestore transaction and HTTP workflow checks are now available.
- Directory substring filtering is server-side over scoped Firestore query results; large-scale discovery should use an indexed search service. Numeric-ID counters may become a write-contention bottleneck at high volume.
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
- [x] Add repeatable HTTP checks for auth, onboarding, cross-user scope, six-member capacity, projects, tasks, and messaging.
- [ ] Add browser-driven acceptance and accessibility regression coverage.
- [ ] Remove remaining lint warnings and run a full keyboard/contrast/mobile audit across every route.
- [x] Migrate active APIs and existing SQLite records to server-only Cloud Firestore with backup and verified import.
- [ ] Configure email verification/reset, media storage, and deployment-specific environment/monitoring.

## Next concrete task

Expand browser acceptance coverage and production observability, and address dependency vulnerabilities, email ownership verification, password reset, and rate limiting. Firestore is already the active storage backend.
