import "server-only";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const appName = "intentlink-server";

export function getFirebaseAdminApp() {
  const existingApp = getApps().find((app) => app.name === appName);
  if (existingApp) return existingApp;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "intentlink-5eef8";
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({ projectId }, appName);
  }

  let credential;
  if (serviceAccountJson) {
    let serviceAccount: unknown;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain the complete, valid service-account JSON.");
    }
    if (!serviceAccount || typeof serviceAccount !== "object" || !("project_id" in serviceAccount)) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must be a service-account JSON object with project_id.");
    }
    credential = cert(serviceAccount as Parameters<typeof cert>[0]);
  } else {
    credential = applicationDefault();
  }

  return initializeApp({ projectId, credential }, appName);
}

export function getFirestoreDatabase() {
  return getFirestore(getFirebaseAdminApp());
}
