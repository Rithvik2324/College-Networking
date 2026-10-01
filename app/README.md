This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
# or
# or
# or
```
## IntentLink Campus App

The runnable product is a Next.js 16 App Router application using React 19, TypeScript, Prisma 6, and SQLite for local persistence.

## Local Setup

Run these commands from this directory:

```powershell
npm install
Copy-Item .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. `.env` is ignored by Git. For local development, `DATABASE_URL="file:./dev.db"` resolves to `prisma/dev.db`. Set `AUTH_SECRET` to a random value of at least 32 characters for deployment; the app intentionally throws in production when it is missing.

Demo accounts seeded from the preserved `data/store.json` are `aarav@college.edu` / `demo123`, `saanvi@college.edu` / `demo123`, and `admin@college.edu` / `admin123`.

## Commands

- `npm run dev` starts the development server.
- `npm run typecheck` runs TypeScript without emitting files.
- `npm run lint` runs ESLint.
- `npm test` runs the built-in Node unit tests.
- `npm run build` creates the production build.
- `npm run db:migrate` applies a local development migration.
- `npm run db:seed` idempotently imports the preserved demo records and example projects.
- `npm run db:studio` opens Prisma Studio.

Commit `prisma/schema.prisma` and `prisma/migrations/`; do not commit `.env`, `prisma/dev.db`, or secrets. To change the schema, edit `prisma/schema.prisma`, then run `npm run db:migrate -- --name describe_change` and regenerate Prisma Client if the command reports a Windows file lock (stop the dev server, run `npx prisma generate`, then restart it).

## Persistence And Deployment Notes

The active API handlers use Prisma, not the legacy JSON store. `data/store.json` is retained as an importable seed source. The current provider is SQLite for a zero-credential local demo. SQLite deployment needs durable disk and a single app instance; serverless or multi-instance production should use managed PostgreSQL and a provider-specific migration before deployment. No hosted database, email service, image-storage provider, or realtime service is configured.

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
