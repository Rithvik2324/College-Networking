import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import nextEnv from "@next/env";
import { fileURLToPath } from "node:url";
import { getFirebaseAdminApp, getFirestoreDatabase } from "../lib/firebase-admin.ts";
import { FirestoreStore } from "../lib/firestore-store.ts";
import { ensureDirectConversation, conversationAccess } from "../lib/conversations.ts";
import { createNotification } from "../lib/notifications.ts";

nextEnv.loadEnvConfig(fileURLToPath(new URL("../", import.meta.url)));

test("Firestore storage integration (temporary isolated collections)", async (suite) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) await getFirebaseAdminApp().options.credential.getAccessToken();
  const database = getFirestoreDatabase();
  const root = database.collection("migrationChecks").doc(randomUUID());
  const store = new FirestoreStore(database, undefined, `${root.path}/`);
  try {
    await root.create({ createdAt: new Date() });
    await suite.test("storage readiness blocks incomplete imports", async () => {
      const guarded = new FirestoreStore(database, undefined, `${root.path}/`, true);
      await assert.rejects(guarded.list("users"), /Firestore is not ready/);
      await root.collection("_meta").doc("storage").set({ version: 1, status: "importing" });
      await assert.rejects(new FirestoreStore(database, undefined, `${root.path}/`, true).create("users", { name: "Blocked" }), /Firestore is not ready/);
      await root.collection("_meta").doc("storage").set({ version: 1, status: "ready" });
      assert.deepEqual(await new FirestoreStore(database, undefined, `${root.path}/`, true).list("users"), []);
    });
    await suite.test("transactions provide read-your-writes and convert timestamps", async () => {
      const user = await store.atomic(async (transaction) => {
        const created = await transaction.create("users", { name: "Test One", email: "one@example.edu", passwordHash: "test-only", skills: ["Backend"] });
        assert.equal((await transaction.get("users", created.id)).name, "Test One");
        assert.equal((await transaction.list("users", [["email", "==", "one@example.edu"]])).length, 1);
        return transaction.update("users", created.id, { bio: "Updated within transaction" });
      });
      const saved = await store.get("users", user.id);
      assert.equal(saved.bio, "Updated within transaction");
      assert.ok(saved.createdAt instanceof Date);
      assert.deepEqual(saved.skills, ["Backend"]);
    });
    await suite.test("failed transactions leave no documents or counter gaps", async () => {
      await assert.rejects(store.atomic(async (transaction) => {
        await transaction.create("users", { name: "Rollback", email: "rollback@example.edu", passwordHash: "test-only" });
        throw new Error("Abort intentionally");
      }));
      assert.equal((await store.list("users")).length, 1);
      const created = await store.create("users", { name: "Test Two", email: "two@example.edu", passwordHash: "test-only" });
      assert.equal(created.id, 2);
    });
    await suite.test("concurrent registration checks reject duplicate email", async () => {
      const register = () => store.atomic(async (transaction) => {
        const existing = await transaction.list("users", [["email", "==", "unique@example.edu"]]);
        if (existing.length) return false;
        await transaction.create("users", { name: "Unique", email: "unique@example.edu", passwordHash: "test-only" });
        return true;
      });
      const results = await Promise.all([register(), register()]);
      assert.equal(results.filter(Boolean).length, 1);
      assert.equal((await store.list("users", [["email", "==", "unique@example.edu"]])).length, 1);
    });
    await suite.test("concurrent joins cannot overfill a community", async () => {
      const community = await store.create("communities", { name: "Test team", goal: "Integration test", intent: "Project-Building", ownerId: 1, maxMembers: 1 });
      const join = (userId) => store.atomic(async (transaction) => {
        const latest = await transaction.get("communities", community.id);
        const members = await transaction.list("communityMembers", [["communityId", "==", community.id]]);
        if (members.length >= latest.maxMembers) return false;
        await transaction.create("communityMembers", { communityId: community.id, userId });
        await transaction.update("communities", community.id, {});
        return true;
      });
      const results = await Promise.all([join(1), join(2)]);
      assert.equal(results.filter(Boolean).length, 1);
      assert.equal((await store.list("communityMembers", [["communityId", "==", community.id]])).length, 1);
    });
    await suite.test("direct conversations are reused and access is membership-scoped", async () => {
      const create = () => store.atomic((transaction) => ensureDirectConversation(transaction, 1, 2));
      const [first, second] = await Promise.all([create(), create()]);
      assert.equal(first.id, second.id);
      assert.ok(await conversationAccess(store, first.id, 1));
      assert.equal(await conversationAccess(store, first.id, 999), null);
    });
    await suite.test("notification opt-out and composite membership deletion work", async () => {
      await store.update("users", 2, { notificationsEnabled: false });
      const disabled = await store.atomic((transaction) => createNotification(transaction, { userId: 2, type: "test", message: "Test", href: null }));
      assert.equal(disabled, null);
      await store.create("projectMembers", { projectId: 1, userId: 1 });
      assert.ok(await store.get("projectMembers", "1_1"));
      await store.remove("projectMembers", "1_1");
      assert.equal(await store.get("projectMembers", "1_1"), null);
    });
  } finally {
    await database.recursiveDelete(root);
    await database.terminate();
  }
});