import type { DatabaseStore, Records } from "./database-store";

export async function userSummary(store: DatabaseStore, id: number) {
  const user = await store.get("users", id);
  return user ? { id: user.id, name: user.name, avatarUrl: user.avatarUrl, primarySkill: user.primarySkill, department: user.department } : null;
}

export async function communityView(store: DatabaseStore, community: Records["communities"], details = false) {
  const memberships = (await store.list("communityMembers", [["communityId", "==", community.id]]))
    .sort((first, second) => first.joinedAt.getTime() - second.joinedAt.getTime());
  const members = await Promise.all(memberships.map(async (member) => ({ ...member, user: await userSummary(store, member.userId) })));
  const tasks = details ? (await store.list("tasks", [["communityId", "==", community.id]]))
    .sort((first, second) => (first.dueAt?.getTime() ?? 0) - (second.dueAt?.getTime() ?? 0) || second.createdAt.getTime() - first.createdAt.getTime()) : undefined;
  const invitations = details ? (await store.list("communityInvitations", [["communityId", "==", community.id], ["status", "==", "pending"]]))
    .map(({ inviteeId }) => ({ inviteeId })) : undefined;
  return { ...community, owner: await userSummary(store, community.ownerId), members, ...(details ? { tasks, invitations } : {}) };
}

export async function projectView(store: DatabaseStore, project: Records["projects"], details = false) {
  const memberships = await store.list("projectMembers", [["projectId", "==", project.id]]);
  const members = await Promise.all(memberships.map(async (member) => ({ ...member, user: await userSummary(store, member.userId) })));
  const requests = await store.list("projectJoinRequests", [["projectId", "==", project.id]]);
  const tasks = details ? (await store.list("tasks", [["projectId", "==", project.id]]))
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime()) : undefined;
  return {
    ...project, owner: await userSummary(store, project.ownerId), members,
    requiredSkills: project.requiredSkills.map((name) => ({ skill: { name } })),
    _count: { joinRequests: requests.length }, ...(details ? { tasks } : {}),
  };
}

export async function messageView(store: DatabaseStore, message: Records["messages"]) {
  return { ...message, sender: await userSummary(store, message.senderId) };
}

export async function taskView(store: DatabaseStore, task: Records["tasks"], details = false) {
  const community = task.communityId ? await store.get("communities", task.communityId) : null;
  const project = task.projectId ? await store.get("projects", task.projectId) : null;
  const activities = details ? await Promise.all((await store.list("taskActivities", [["taskId", "==", task.id]]))
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime()).slice(0, 8)
    .map(async (activity) => ({ ...activity, actor: await userSummary(store, activity.actorId) }))) : undefined;
  return { ...task, assignee: task.assigneeId ? await userSummary(store, task.assigneeId) : null,
    community: community ? { id: community.id, name: community.name } : null,
    project: project ? { id: project.id, title: project.title } : null,
    ...(details ? { activities } : {}),
  };
}