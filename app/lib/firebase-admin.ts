import "server-only";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const appName = "intentlink-server";

export function getFirebaseAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "intentlink";
  const existingApp = getApps().find((app) => app.name === appName);
  const app = existingApp ?? initializeApp(
    process.env.FIRESTORE_EMULATOR_HOST
      ? { projectId }
      : { projectId, credential: applicationDefault() },
    appName,
  );

  return app;
}

export function getFirestoreDatabase() {
  return getFirestore(getFirebaseAdminApp());
}