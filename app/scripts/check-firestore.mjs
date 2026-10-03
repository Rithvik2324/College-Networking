import nextEnv from "@next/env";
import { fileURLToPath } from "node:url";
import { getFirebaseAdminApp, getFirestoreDatabase } from "../lib/firebase-admin.ts";

nextEnv.loadEnvConfig(fileURLToPath(new URL("../", import.meta.url)));

let database;
let timeout;

try {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    await getFirebaseAdminApp().options.credential?.getAccessToken();
  }
  database = getFirestoreDatabase();
  await Promise.race([
    database.collection("users").limit(1).get(),
    new Promise((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error("Connection timed out.")), 20000);
    }),
  ]);
  const target = process.env.FIRESTORE_EMULATOR_HOST ? "local emulator" : "Cloud Firestore";
  console.log(`Connected to ${target} for ${database.projectId}. Read access verified; no data changed.`);
} catch {
  console.error(
    "Firestore connection could not be verified. Set GOOGLE_APPLICATION_CREDENTIALS to a local service-account JSON file, or configure Application Default Credentials. Check that Cloud Firestore (default database) is enabled for FIREBASE_PROJECT_ID, that the account has Firestore access, and that the network is reachable. See README.md: Firestore Setup.",
  );
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  if (database) await database.terminate();
}