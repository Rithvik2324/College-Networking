"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { firebaseConfig, isFirebaseConfigured, listMissingFirebaseEnvKeys } from "./config";

/** Browser Firebase clients. Call these only from client components/modules. */
function getFirebaseApp() {
  if (!isFirebaseConfigured) {
    throw new Error(`Firebase is not configured. Missing: ${listMissingFirebaseEnvKeys().join(", ")}`);
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

/** Analytics is browser-only and unavailable in some privacy-focused contexts. */
export async function initializeFirebaseAnalytics() {
  const app = getFirebaseApp();
  return (await isSupported()) ? getAnalytics(app) : null;
}
