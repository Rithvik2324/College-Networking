import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore, type Records } from "@/lib/firestore-store";
import { taskView } from "@/lib/views";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const taskStatus = z.enum(["Backlog", "To Do", "In Progress", "Review", "Completed"]);
const taskPriority = z.enum(["Low", "Medium", "High", "Critical"]);
const taskCreateSchema = z.object({
  communityId: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1000).optional(),
  assigneeId: z.coerce.number().int().positive().optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  dueDate: z.string().optional(),
});
const taskUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().max(1000).optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  assigneeId: z.coerce.number().int().positive().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

function isValidDate(value: string | undefined) {
  return value === undefined || Number.isFinite(Date.parse(value));
}

async function hasWorkspaceManagementAccess(userId: number, task: {
  communityId: number | null;
  projectId: number | null;
}) {
  const [communityMember, projectMember] = await Promise.all([
    task.communityId
      ? getStore().get("communityMembers", `${task.communityId}_${userId}`)
      : null,
    task.projectId
      ? getStore().get("projectMembers", `${task.projectId}_${userId}`)
      : null,
  ]);
  return ["owner", "lead"].includes(communityMember?.role || "") || ["owner", "lead"].includes(projectMember?.role || "");
}

async function canAccessTask(userId: number, task: {
  communityId: number | null;
  projectId: number | null;
  createdById: number;
  assigneeId: number | null;
}) {
  if (task.assigneeId === userId || task.createdById === userId) return true;
  return hasWorkspaceManagementAccess(userId, task);
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = getStore();
  const teams = await store.list("communityMembers", [["userId", "==", currentUser.id]]);
  const projects = await store.list("projectMembers", [["userId", "==", currentUser.id]]);
  const groups = await Promise.all([
    store.list("tasks", [["createdById", "==", currentUser.id]]),
    store.list("tasks", [["assigneeId", "==", currentUser.id]]),
    ...teams.map((team) => store.list("tasks", [["communityId", "==", team.communityId]])),
    ...projects.map((project) => store.list("tasks", [["projectId", "==", project.projectId]])),
  ]);
  const visible = new Map<number, Records["tasks"]>();
  for (const task of groups.flat()) visible.set(task.id, task);
  const tasks = await Promise.all([...visible.values()]
    .sort((first, second) => (first.dueAt?.getTime() ?? 0) - (second.dueAt?.getTime() ?? 0) || second.createdAt.getTime() - first.createdAt.getTime())
    .map((task) => taskView(store, task, true)));
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = taskCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.communityId && !parsed.data.projectId) || !isValidDate(parsed.data.dueDate)) {
    return NextResponse.json({ error: "Enter a valid title, workspace, and due date." }, { status: 400 });
  }

  const data = parsed.data;
  const [communityMembership, projectMembership] = await Promise.all([
    data.communityId
      ? getStore().get("communityMembers", `${data.communityId}_${currentUser.id}`)
      : null,
    data.projectId
      ? getStore().get("projectMembers", `${data.projectId}_${currentUser.id}`)
      : null,
  ]);
  if ((data.communityId && !communityMembership) || (data.projectId && !projectMembership)) {
    return NextResponse.json({ error: "Join this team or project before creating its tasks." }, { status: 403 });
  }

  const assigneeId = data.assigneeId || currentUser.id;
  if (data.communityId) {
    const assigneeMember = await getStore().get("communityMembers", `${data.communityId}_${assigneeId}`);
    if (!assigneeMember) return NextResponse.json({ error: "Assignee must belong to this team." }, { status: 400 });
  }
  if (data.projectId) {
    const assigneeMember = await getStore().get("projectMembers", `${data.projectId}_${assigneeId}`);
    if (!assigneeMember) return NextResponse.json({ error: "Assignee must belong to this project." }, { status: 400 });
  }

  const store = getStore();
  const created = await store.atomic(async (transaction) => {
    const task = await transaction.create("tasks", {
      title: data.title,
      description: data.description || "",
      communityId: data.communityId ?? null,
      projectId: data.projectId ?? null,
      assigneeId,
      createdById: currentUser.id,
      status: data.status || "To Do",
      priority: data.priority || "Medium",
      dueAt: data.dueDate ? new Date(data.dueDate) : null,
    });
    await transaction.create("taskActivities", { taskId: task.id, actorId: currentUser.id, action: "created", details: data.title });
    if (assigneeId !== currentUser.id) await createNotification(transaction, {
      userId: assigneeId,
      type: "task-assignment",
      message: `You were assigned: ${task.title}`,
      href: "/tasks",
    });
    return task;
  });
  const task = await taskView(store, created);
  return NextResponse.json({ task }, { status: 201 });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = taskUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isValidDate(parsed.data.dueDate || undefined)) {
    return NextResponse.json({ error: "Enter valid task updates." }, { status: 400 });
  }
  const data = parsed.data;
  const task = await getStore().get("tasks", data.id);

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (!(await canAccessTask(currentUser.id, task))) {
    return NextResponse.json({ error: "You do not have access to this task." }, { status: 403 });
  }
  if (
    data.assigneeId !== undefined &&
    data.assigneeId !== task.assigneeId &&
    task.createdById !== currentUser.id &&
    !(await hasWorkspaceManagementAccess(currentUser.id, task))
  ) {
    return NextResponse.json({ error: "Only the task creator or a workspace lead can reassign work." }, { status: 403 });
  }

  if (data.assigneeId && task.communityId) {
    const member = await getStore().get("communityMembers", `${task.communityId}_${data.assigneeId}`);
    if (!member) return NextResponse.json({ error: "Assignee must belong to this team." }, { status: 400 });
  }
  if (data.assigneeId && task.projectId) {
    const member = await getStore().get("projectMembers", `${task.projectId}_${data.assigneeId}`);
    if (!member) return NextResponse.json({ error: "Assignee must belong to this project." }, { status: 400 });
  }

  const { id, dueDate, ...updates } = data;
  const store = getStore();
  const updated = await store.atomic(async (transaction) => {
    const updatedTask = await transaction.update("tasks", id, {
      ...updates,
      ...(dueDate !== undefined ? { dueAt: dueDate ? new Date(dueDate) : null } : {}),
    });
    await transaction.create("taskActivities", {
          taskId: id,
          actorId: currentUser.id,
          action: "updated",
          details: [updates.status, updates.priority, updates.title].filter(Boolean).join(" · ") || "Task details changed",
    });
    if (data.assigneeId && data.assigneeId !== currentUser.id && data.assigneeId !== task.assigneeId) await createNotification(transaction, {
      userId: data.assigneeId,
      type: "task-assignment",
      message: `You were assigned: ${updatedTask.title}`,
      href: "/tasks",
    });
    return updatedTask;
  });
  const updatedTask = await taskView(store, updated);
  return NextResponse.json({ task: updatedTask });
}
