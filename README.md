# IntentLink Campus

The active Next.js app is in `app/`. Account creation and login use Firebase Authentication; user profiles are stored in Cloud Firestore under `users/{uid}`.

## Run locally

```powershell
Set-Location .\app
npm install
Copy-Item .env.example .env
npm run dev
```

Enable Email/Password in Firebase Authentication and create a Firestore database for project `intentlink-5eef8`. The supplied Firebase web configuration is in `.env.example`. Set those `NEXT_PUBLIC_FIREBASE_*` values as Vercel environment variables and redeploy the IntentLink project.

## Data migration status

Login and registration create/read Firebase Auth accounts and Firestore user profiles. Existing SQLite records are not automatically imported. Other collaboration APIs still reference the former Prisma model and require a Firestore migration before those workflows are operational. No remote data is deleted by removing local database wiring; manage remote records in the Firebase console.
