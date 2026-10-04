import "server-only";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const appName = "intentlink-server";

export function getFirebaseAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "intentlink-5eef8";
  const existingApp = getApps().find((app) => app.name === appName);
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const credential = serviceAccountJson
    ? cert(JSON.parse(serviceAccountJson))
    : applicationDefault();
  const app = existingApp ?? initializeApp(
    process.env.FIRESTORE_EMULATOR_HOST
      ? { projectId }
      : { projectId, credential },
    appName,
  );

  return app;
}

export function getFirestoreDatabase() {
  return getFirestore(getFirebaseAdminApp());
}
