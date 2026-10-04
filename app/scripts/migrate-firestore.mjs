import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminApp, getFirestoreDatabase } from "../lib/firebase-admin.ts";

const appDirectory = fileURLToPath(new URL("../", import.meta.url));
nextEnv.loadEnvConfig(appDirectory);
const args = new Set(process.argv.slice(2));
const collections = {
  users: "user", communities: "community", communityMembers: "communityMember",
  communityInvitations: "communityInvitation", collaborationRequests: "collaborationRequest",
  projects: "project", projectMembers: "projectMember", projectJoinRequests: "projectJoinRequest",
  tasks: "task", taskActivities: "taskActivity", conversations: "conversation",
  conversationMembers: "conversationMember", messages: "message", notifications: "notification",
};
const compositeKeys = {
  communityMembers: ["communityId", "userId"], projectMembers: ["projectId", "userId"],
  conversationMembers: ["conversationId", "userId"],
};

function canonical(value) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => [key, canonical(entry)]));
  }
  return value;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function keyFor(collection, row) {
  return compositeKeys[collection] ? compositeKeys[collection].map((field) => row[field]).join("_") : String(row.id);
}

async function readSource(client) {
  const values = await client.$transaction(Object.entries(collections).map(([collection, model]) => client[model].findMany(
    collection === "users" ? { include: { skills: { include: { skill: true } }, interests: { include: { interest: true } } } }
      : collection === "projects" ? { include: { requiredSkills: { include: { skill: true } } } } : {},
  )));
  const snapshot = Object.fromEntries(Object.keys(collections).map((collection, index) => [collection, values[index].map((row) => {
    if (collection === "users") return { ...row, skills: row.skills.map(({ skill }) => skill.name),
      skillLevels: Object.fromEntries(row.skills.map(({ skill, level }) => [skill.name, level])),
      interests: row.interests.map(({ interest }) => interest.name) };
    if (collection === "projects") return { ...row, requiredSkills: row.requiredSkills.map(({ skill }) => skill.name) };
    return row;
  }).sort((first, second) => keyFor(collection, first).localeCompare(keyFor(collection, second)))]));
  const sequences = await client.$queryRawUnsafe("SELECT name, seq FROM sqlite_sequence");
  const counters = Object.fromEntries(Object.entries(collections).filter(([collection]) => !compositeKeys[collection])
    .map(([collection, model]) => [collection, Math.max(0, ...snapshot[collection].map((row) => row.id),
      Number(sequences.find((entry) => entry.name === model[0].toUpperCase() + model.slice(1))?.seq ?? 0))]));
  return { snapshot, counters };
}

async function verify(database, snapshot) {
  for (const [collection, rows] of Object.entries(snapshot)) {
    const actual = await database.collection(collection).get();
    if (actual.size !== rows.length) throw new Error(`Migration: ${collection} count mismatch.`);
    const expected = new Map(rows.map((row) => [keyFor(collection, row), digest(row)]));
    for (const document of actual.docs) {
      if (expected.get(document.id) !== digest(document.data())) throw new Error(`Migration: ${collection} content mismatch.`);
    }
    console.log(`Verified ${collection}: ${rows.length} records.`);
  }
}

let source;
let database;
try {
  const initializeEmpty = args.has("--initialize-empty");
  let snapshot;
  let counters;
  let backup;
  if (initializeEmpty) {
    snapshot = Object.fromEntries(Object.keys(collections).map((collection) => [collection, []]));
    counters = Object.fromEntries(Object.keys(collections).filter((collection) => !compositeKeys[collection]).map((collection) => [collection, 0]));
  } else {
    source = new PrismaClient();
    if (!args.has("--dry-run") && !args.has("--verify")) {
      const directory = join(appDirectory, ".backups");
      await mkdir(directory, { recursive: true });
      backup = `before-firestore-${Date.now()}.db`;
      const backupPath = join(directory, backup);
      await source.$executeRawUnsafe("VACUUM INTO ?", backupPath);
      await source.$disconnect();
      source = new PrismaClient({ datasourceUrl: `file:${backupPath.replaceAll("\\", "/")}` });
      console.log(`SQLite backup created in .backups/${backup}.`);
    }
    ({ snapshot, counters } = await readSource(source));
  }
  if (args.has("--dry-run")) {
    for (const [collection, rows] of Object.entries(snapshot)) console.log(`${collection}: ${rows.length} records to migrate.`);
    console.log("Dry run complete. No cloud data or local database records changed.");
  } else {
    if (!process.env.FIRESTORE_EMULATOR_HOST) await getFirebaseAdminApp().options.credential.getAccessToken();
    database = getFirestoreDatabase();
    const marker = database.collection("_meta").doc("storage");
    if (args.has("--verify")) {
      if ((await marker.get()).data()?.status !== "ready") throw new Error("Migration: storage is not ready.");
      await verify(database, snapshot);
    } else {
      const fingerprint = digest({ snapshot, counters });
      const existingMarker = (await marker.get()).data();
      if (existingMarker?.status === "ready") throw new Error("Migration: Firestore is already initialized. Import refused; use db:verify for the original source audit.");
      for (const collection of Object.keys(collections)) {
        const existing = await database.collection(collection).limit(1).get();
        if (!existing.empty && (existingMarker?.status !== "importing" || existingMarker?.fingerprint !== fingerprint)) {
          throw new Error(`Migration: ${collection} already contains cloud data. Import refused.`);
        }
      }
      await database.runTransaction(async (transaction) => {
        const current = (await transaction.get(marker)).data();
        if (current && (current.status !== "importing" || current.fingerprint !== fingerprint)) {
          throw new Error("Migration: another migration or initialized database exists.");
        }
        transaction.set(marker, { status: "importing", version: 1, fingerprint, backup: backup ?? null, startedAt: new Date() });
      });
      for (const [collection, rows] of Object.entries(snapshot)) {
        const existing = new Map((await database.collection(collection).get()).docs.map((document) => [document.id, document.data()]));
        let batch = database.batch();
        let pending = 0;
        for (const row of rows) {
          const key = keyFor(collection, row);
          if (existing.has(key)) {
            if (digest(existing.get(key)) !== digest(row)) throw new Error(`Migration: ${collection} has conflicting records. Import stopped.`);
            continue;
          }
          batch.create(database.collection(collection).doc(key), row);
          pending++;
          if (pending === 400) {
            await batch.commit();
            batch = database.batch();
            pending = 0;
          }
        }
        if (pending) await batch.commit();
        console.log(`Imported ${collection}: ${rows.length} records.`);
      }
      await verify(database, snapshot);
      await database.runTransaction(async (transaction) => {
        const current = (await transaction.get(marker)).data();
        if (current?.fingerprint !== fingerprint || current.status !== "importing") throw new Error("Migration: readiness marker changed unexpectedly.");
        for (const [collection, value] of Object.entries(counters)) transaction.set(database.collection("_counters").doc(collection), { value });
        transaction.update(marker, { status: "ready", completedAt: new Date(), counts: Object.fromEntries(Object.entries(snapshot).map(([collection, rows]) => [collection, rows.length])) });
      });
      console.log("Firestore is ready. The app now uses Firestore; SQLite is retained only as an offline backup/import source.");
    }
  }
} catch (error) {
  console.error(error instanceof Error && error.message.startsWith("Migration:") ? error.message
    : "Migration failed. Check local SQLite access, Firebase credentials, Firestore permissions, and network connectivity. Existing cloud records were not overwritten.");
  process.exitCode = 1;
} finally {
  if (source) await source.$disconnect();
  if (database) await database.terminate();
}