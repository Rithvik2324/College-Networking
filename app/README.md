This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
# or
# or
# or
```
## IntentLink Campus App

The runnable product is a Next.js 16 App Router application using React 19, TypeScript, and Cloud Firestore through the server-only Firebase Admin SDK. The existing bcrypt passwords and HTTP-only JWT sessions are preserved; Firebase Authentication is not used.

## Local Setup

Run these commands from this directory:

```powershell
npm install
Copy-Item .env.example .env
```

Configure Firebase credentials as described below, then run:

```powershell
npm run firebase:check
npm run dev
```

Open http://localhost:3000. Do not overwrite existing environment files. `.env` and `.env.local` are ignored by Git. `DATABASE_URL` is used only by the archived SQLite import tools, not by the app. Set `AUTH_SECRET` to a random value of at least 32 characters for deployment; the app intentionally throws in production when it is missing. The `intentlink` database is already migrated; do not reinitialize it. For a new empty Firestore project, deploy the server-only rules with `npm run firebase:rules`, then run `npm run db:init` once.

Demo accounts seeded from the preserved `data/store.json` are `aarav@college.edu` / `demo123`, `saanvi@college.edu` / `demo123`, and `admin@college.edu` / `admin123`.

## Commands

- `npm run dev` starts the development server.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run lint` runs ESLint.
- `npm test` runs the built-in Node unit tests.
- `npm run build` creates the production build.
- `npm run firebase:check` verifies cloud read access without modifying data.
- `npm run firebase:rules` backs up and deploys `firestore.rules`; add `-- --verify` to audit the deployed rules only.
- `npm run test:firestore` runs live isolated transaction tests and removes their temporary collections.
- `npm run test:workflows -- http://localhost:3000` checks actual HTTP workflows using temporary accounts and removes their data afterward. Run against a local development server with test credentials only.
- `npm run db:migrate -- --dry-run` previews the SQLite-to-Firestore import.
- `npm run db:migrate` backs up SQLite, imports into empty Firestore collections, verifies every record, and marks storage ready. It refuses to overwrite unrelated or already-initialized cloud data. An interrupted import can resume only with an identical source snapshot.
- `npm run db:verify` compares Firestore against the original SQLite source immediately after migration. Normal app edits will intentionally cause this original-source audit to fail.
- `npm run db:init` initializes a new empty Firestore database, not an already-migrated project.
- `npm run db:migrate:sqlite`, `npm run db:seed:sqlite`, and `npm run db:studio:sqlite` are archived offline import tools only.

Keep the archived Prisma schema and migrations for source recovery. Do not commit environment files, `.backups`, SQLite databases, or service-account keys. Prisma is development-only and is never instantiated by API handlers.

## Persistence And Deployment Notes

All active APIs use Firestore with no SQLite fallback. `data/store.json`, the original SQLite database, and `.backups` are offline recovery/import sources only. Configure the same Firestore project and a stable `AUTH_SECRET` on every server instance. No email service, image-storage provider, or realtime push service is configured.

## Firestore Setup

1. In Firebase Console, select `intentlink`, then **Build > Firestore Database**. Create the default database if necessary. Use production mode, not public test-mode rules.
2. Open **Project settings > Service accounts > Generate new private key**. Save the downloaded JSON file outside this repository. Do not share its contents or commit it. Treat it as a password.
3. Add these entries to your existing `.env.local` in this directory (or `.env` if no `.env.local` exists). Preserve your `AUTH_SECRET` and, for archived imports only, `DATABASE_URL`. Replace the sample path with the actual downloaded file path; forward slashes work on Windows.

```dotenv
FIREBASE_PROJECT_ID="intentlink"
GOOGLE_APPLICATION_CREDENTIALS="C:/Users/YourName/firebase-admin.json"
```

4. From this directory, run `npm run firebase:check`. The check reads at most one document from `users`, prints no document data, and does not write anything. An empty collection is a valid successful connection. Restart the dev server after changing environment variables.

The account needs Firestore access, such as the `roles/datastore.user` IAM role. On a Google-hosted deployment, prefer Application Default Credentials via an attached service account rather than downloading a key; leave `GOOGLE_APPLICATION_CREDENTIALS` unset. The check loads the same Next.js environment files as the app. For local emulator testing, set `FIRESTORE_EMULATOR_HOST` to `127.0.0.1:8080` with no URL scheme; this does not verify cloud access.

Server code uses `getStore` from `@/lib/firestore-store`. Initialization is lazy and reuses the Admin app during development reloads. The module is blocked from client components. Admin access uses IAM and bypasses Firestore Security Rules; API routes retain session and authorization checks. The deployed `firestore.rules` denies all client reads and writes because Firebase clients cannot authenticate with the app's JWT cookie. Never prefix Admin credential variables with `NEXT_PUBLIC_`.

The Firebase web configuration supplied for this project is not an Admin credential. Its API key, auth domain, and Analytics measurement ID are not needed for this server connection. This setup does not enable Firebase Authentication or Analytics.

### Migration Status

The `intentlink` project uses Firestore as its active source of truth. The initial 25 records across 14 collections were imported and verified against a SQLite snapshot, including five existing users and their password hashes. A consistent SQLite backup was saved under `.backups` before import. Existing numeric IDs, relationships, dates, preferences, and onboarding state are preserved. Skills and interests are embedded on profiles; required skills are embedded on projects; existing skill levels are retained on profiles.

Collections are `users`, `communities`, `communityMembers`, `communityInvitations`, `collaborationRequests`, `projects`, `projectMembers`, `projectJoinRequests`, `tasks`, `taskActivities`, `conversations`, `conversationMembers`, `messages`, and `notifications`. Composite membership document IDs are `workspaceId_userId`; other document IDs are the preserved numeric IDs as strings. `_counters` allocates new numeric IDs transactionally. `_meta/storage` blocks app access until an import is verified and marked ready. Never edit these control documents manually.

Queries use single-field indexes; remaining filters and substring searches run on the server over the scoped query results. High-volume discovery/full-text search and numeric-ID counter contention should be revisited before scaling to a large campus deployment. Membership capacity, request decisions, task activities, and message notifications are transactional. Firestore does not change the existing polling-based messaging UI.

Email verification and password reset are not implemented. Direct conversations and team messages are persisted; direct-message views poll while open rather than using websockets. Profile avatars currently accept an image URL and do not upload files.

See `../docs/IMPLEMENTATION_STATUS.md` for acceptance checks and the remaining release work.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
