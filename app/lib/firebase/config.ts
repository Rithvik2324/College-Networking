/**
 * Firebase web app configuration.
 *
 * Values come from `NEXT_PUBLIC_*` environment variables so the exact same
 * configuration reaches both the server render and the browser bundle. These
 * values are public by design — a Firebase web config is not a secret; access
 * is controlled by security rules and the enabled provider list in the
 * Firebase console.
 */


export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  /** Present only when Google Analytics is enabled for the Firebase project. */
  measurementId?: string;
};
const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export const firebaseConfig: FirebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

/** Environment keys that still need a value before Firebase can be initialised. */
export function listMissingFirebaseEnvKeys(): string[] {
  return REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
}

/** True when every value `initializeApp` requires has been provided. */
export const isFirebaseConfigured = listMissingFirebaseEnvKeys().length === 0;

/** Analytics also needs a measurement ID, which is optional for the other SDKs. */
export const isFirebaseAnalyticsEnabled = isFirebaseConfigured && Boolean(firebaseConfig.measurementId);
