import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { getFirebaseAdminApp, getFirestoreDatabase } from "../lib/firebase-admin.ts";

nextEnv.loadEnvConfig(fileURLToPath(new URL("../", import.meta.url)));
const origin = new URL(process.argv[2] || "http://localhost:3000");
assert.ok(["localhost", "127.0.0.1"].includes(origin.hostname), "Workflow checks require a local server.");
const tag = `migration-${randomUUID()}`;
const accounts = [];
let database;

async function call(actor, path, method = "GET", body, expected = 200) {
  const response = await fetch(new URL(path, origin), { method,
    headers: { "Content-Type": "application/json", ...(actor?.cookie ? { Cookie: actor.cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, expected, `${method} ${path}: unexpected status`);
  if (actor && response.headers.get("set-cookie")) actor.cookie = response.headers.get("set-cookie").split(";")[0];
  const data = await response.json();
  assert.equal(JSON.stringify(data).includes('"passwordHash"'), false, "API exposed a password hash");
  return data;
}

async function account(index) {
  const actor = { email: `${tag}-${index}@college.edu`, password: `Check-${randomUUID()}` };
  accounts.push(actor);
  const result = await call(actor, "/api/auth/register", "POST", { name: `Migration Test ${index}`, email: actor.email, password: actor.password }, 201);
  actor.id = result.user.id;
  await call(actor, "/api/profile", "PUT", { college: "Migration Test College", department: "Engineering", yearOfStudy: 2,
    intent: "Project-Building", skill: "Backend", skills: ["Backend"], availability: 8, bio: "Temporary verification profile", interests: ["Testing"], completeOnboarding: true });
  return actor;
}

async function clean() {
  const users = (await database.collection("users").get()).docs.filter((document) => document.data().email.startsWith(`${tag}-`));
  const ids = users.map((document) => document.data().id);
  if (!ids.length) return;
  const references = new Map(users.map((document) => [document.ref.path, document.ref]));
  const collect = async (collection, field, values) => {
    if (!values.length) return [];
    const snapshot = await database.collection(collection).where(field, "in", values).get();
    for (const document of snapshot.docs) references.set(document.ref.path, document.ref);
    return snapshot.docs.map((document) => document.data());
  };
  const communities = await collect("communities", "ownerId", ids);
  const projects = await collect("projects", "ownerId", ids);
  const members = await collect("conversationMembers", "userId", ids);
  const conversationIds = [...new Set(members.map((member) => member.conversationId))];
  await collect("conversations", "id", conversationIds);
  await collect("conversationMembers", "conversationId", conversationIds);
  await collect("messages", "conversationId", conversationIds);
  await collect("communityMembers", "communityId", communities.map((community) => community.id));
  await collect("projectMembers", "projectId", projects.map((project) => project.id));
  await collect("communityInvitations", "inviterId", ids);
  await collect("communityInvitations", "inviteeId", ids);
  await collect("collaborationRequests", "senderId", ids);
  await collect("collaborationRequests", "receiverId", ids);
  await collect("projectJoinRequests", "applicantId", ids);
  await collect("tasks", "createdById", ids);
  await collect("taskActivities", "actorId", ids);
  await collect("notifications", "userId", ids);
  const batch = database.batch();
  for (const ref of references.values()) batch.delete(ref);
  await batch.commit();
  console.log("Temporary workflow accounts and records removed; ID counters remain monotonic.");
}

try {
  if (!process.env.FIRESTORE_EMULATOR_HOST) await getFirebaseAdminApp().options.credential.getAccessToken();
  database = getFirestoreDatabase();
  await call(null, "/api/tasks", "GET", undefined, 401);
  const owner = await account(1);
  const member = await account(2);
  const outsider = await account(3);
  await call(null, "/api/auth/register", "POST", { name: "Duplicate", email: owner.email, password: owner.password }, 409);
  await call(owner, "/api/auth/login", "POST", { email: owner.email, password: owner.password });
  assert.equal((await call(owner, "/api/profile")).user.id, owner.id);
  await call(owner, "/api/profile", "PUT", { userId: member.id, bio: "Updated owner only" });
  assert.equal((await call(member, "/api/profile")).user.bio, "Temporary verification profile");
  await call(owner, "/api/students?q=Migration&skill=Backend");
  await call(owner, `/api/students/${member.id}`);
  await call(owner, "/api/match");
  await call(owner, "/api/settings");
  console.log("Passed registration, duplicate-email rejection, login, onboarding, profile scope, discovery, matching, and settings.");

  const team = (await call(owner, "/api/communities", "POST", { name: "Migration Private Team", goal: "Verify private team workflows", intent: "Project-Building", isPrivate: true }, 201)).community;
  await call(outsider, `/api/communities/${team.id}`, "GET", undefined, 404);
  assert.equal((await call(outsider, "/api/communities")).communities.some((community) => community.id === team.id), false);
  const invitation = (await call(owner, `/api/communities/${team.id}/invitations`, "POST", { inviteeId: member.id }, 201)).invitation;
  await call(member, "/api/invitations");
  await call(member, `/api/invitations/${invitation.id}`, "PATCH", { status: "accepted" });
  await call(member, `/api/invitations/${invitation.id}`, "PATCH", { status: "accepted" }, 409);
  await call(member, `/api/communities/${team.id}`);
  const project = (await call(owner, "/api/projects", "POST", { title: "Migration Test Project", description: "Temporary end-to-end migration verification", category: "Testing", skills: ["Backend"] }, 201)).project;
  const join = (await call(member, `/api/projects/${project.id}/requests`, "POST", undefined, 201)).request;
  await call(outsider, `/api/projects/${project.id}/requests`, "GET", undefined, 403);
  await call(owner, `/api/projects/${project.id}/requests`, "PATCH", { requestId: join.id, status: "accepted" });
  await call(member, `/api/projects/${project.id}`);
  await call(owner, "/api/projects?q=Migration");
  console.log("Passed private-team visibility, invitations, repeat-response protection, project creation, and owner-reviewed membership.");

  const connection = (await call(owner, "/api/collaboration-requests", "POST", { receiverId: member.id }, 201)).request;
  await call(member, `/api/collaboration-requests/${connection.id}`, "PATCH", { status: "accepted" });
  await call(owner, "/api/collaboration-requests");
  const direct = await call(owner, "/api/conversations", "POST", { recipientId: member.id, message: "Migration verification message" }, 201);
  await call(owner, "/api/conversations");
  assert.ok((await call(member, `/api/conversations/${direct.conversationId}/messages`)).messages.some((message) => message.id === direct.message.id));
  await call(outsider, `/api/conversations/${direct.conversationId}/messages`, "GET", undefined, 404);
  await call(member, `/api/conversations/${direct.conversationId}/messages`, "POST", { message: "Migration verification reply" }, 201);
  await call(owner, "/api/messages", "POST", { communityId: team.id, text: "Team verification message" }, 201);
  await call(member, `/api/messages?communityId=${team.id}`);
  await call(outsider, `/api/messages?communityId=${team.id}`, "GET", undefined, 403);
  const task = (await call(owner, "/api/tasks", "POST", { communityId: team.id, title: "Migration verification task", assigneeId: member.id }, 201)).task;
  await call(member, "/api/tasks", "PATCH", { id: task.id, status: "In Progress" });
  await call(outsider, "/api/tasks", "PATCH", { id: task.id, status: "Completed" }, 403);
  await call(member, "/api/tasks", "PATCH", { id: task.id, assigneeId: owner.id }, 403);
  await call(owner, "/api/tasks", "PATCH", { id: task.id, priority: "High", dueDate: "2026-10-10" });
  const savedTask = (await call(owner, "/api/tasks")).tasks.find((entry) => entry.id === task.id);
  assert.equal(savedTask.status, "In Progress");
  assert.ok(savedTask.activities.length >= 3);
  await call(member, "/api/settings", "PUT", { notificationsEnabled: false });
  const before = (await call(member, "/api/notifications")).notifications.length;
  await call(owner, `/api/conversations/${direct.conversationId}/messages`, "POST", { message: "Opt-out verification" }, 201);
  assert.equal((await call(member, "/api/notifications")).notifications.length, before);
  await call(owner, "/api/notifications", "PATCH", { markAll: true });
  console.log("Passed collaboration acceptance, direct/team messages, nonmember rejection, task activities, reassignment protection, and notification opt-out.");

  const publicTeam = (await call(owner, "/api/communities", "POST", { name: "Migration Capacity Team", goal: "Verify six-member limit", intent: "Project-Building" }, 201)).community;
  await call(member, `/api/communities/${publicTeam.id}/membership`, "POST", undefined, 201);
  const extras = [];
  for (let index = 4; index <= 7; index++) extras.push(await account(index));
  for (const actor of extras.slice(0, 3)) await call(actor, `/api/communities/${publicTeam.id}/membership`, "POST", undefined, 201);
  const candidates = [extras[3], outsider];
  const results = await Promise.all(candidates.map(async (actor) => {
    const response = await fetch(new URL(`/api/communities/${publicTeam.id}/membership`, origin), { method: "POST", headers: { Cookie: actor.cookie }, signal: AbortSignal.timeout(60000) });
    return response.status;
  }));
  assert.deepEqual([...results].sort(), [201, 409]);
  assert.equal((await call(owner, `/api/communities/${publicTeam.id}`)).community.members.length, 6);
  await call(owner, `/api/communities/${publicTeam.id}/membership`, "DELETE", undefined, 403);
  await call(member, `/api/communities/${publicTeam.id}/membership`, "DELETE");
  await call(candidates[results.indexOf(409)], `/api/communities/${publicTeam.id}/membership`, "POST", undefined, 201);
  await call(member, `/api/communities/${team.id}/membership`, "DELETE");
  await call(member, `/api/messages?communityId=${team.id}`, "GET", undefined, 403);
  console.log("Passed concurrent six-member capacity, owner leave restriction, freed-slot reuse, and former-member message rejection.");
  const demo = {};
  assert.equal((await call(demo, "/api/auth/login", "POST", { email: "aarav@college.edu", password: "demo123" })).user.email, "aarav@college.edu");
  console.log("Passed migrated demo-account login. All HTTP workflow checks passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Workflow check failed.");
  process.exitCode = 1;
} finally {
  if (database) {
    await clean();
    await database.terminate();
  }
}