import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
      ? prisma.communityMember.findUnique({ where: { communityId_userId: { communityId: task.communityId, userId } } })
      : null,
    task.projectId
      ? prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: task.projectId, userId } } })
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

  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { createdById: currentUser.id },
        { assigneeId: currentUser.id },
        { community: { members: { some: { userId: currentUser.id } } } },
        { project: { members: { some: { userId: currentUser.id } } } },
      ],
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      community: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
      activities: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });
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
      ? prisma.communityMember.findUnique({ where: { communityId_userId: { communityId: data.communityId, userId: currentUser.id } } })
      : null,
    data.projectId
      ? prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: data.projectId, userId: currentUser.id } } })
      : null,
  ]);
  if (!communityMembership && !projectMembership) {
    return NextResponse.json({ error: "Join this team or project before creating its tasks." }, { status: 403 });
  }

  const assigneeId = data.assigneeId || currentUser.id;
  if (data.communityId) {
    const assigneeMember = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: data.communityId, userId: assigneeId } },
    });
    if (!assigneeMember) return NextResponse.json({ error: "Assignee must belong to this team." }, { status: 400 });
  }
  if (data.projectId) {
    const assigneeMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: data.projectId, userId: assigneeId } },
    });
    if (!assigneeMember) return NextResponse.json({ error: "Assignee must belong to this project." }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || "",
      communityId: data.communityId,
      projectId: data.projectId,
      assigneeId,
      createdById: currentUser.id,
      status: data.status || "To Do",
      priority: data.priority || "Medium",
      dueAt: data.dueDate ? new Date(data.dueDate) : null,
      activities: { create: { actorId: currentUser.id, action: "created", details: data.title } },
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      community: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
    },
  });
  if (assigneeId !== currentUser.id) {
    await createNotification(prisma, {
      userId: assigneeId,
      type: "task-assignment",
      message: `You were assigned: ${task.title}`,
      href: "/tasks",
    });
  }

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
  const task = await prisma.task.findUnique({ where: { id: data.id } });

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
    const member = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: task.communityId, userId: data.assigneeId } },
    });
    if (!member) return NextResponse.json({ error: "Assignee must belong to this team." }, { status: 400 });
  }
  if (data.assigneeId && task.projectId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId: data.assigneeId } },
    });
    if (!member) return NextResponse.json({ error: "Assignee must belong to this project." }, { status: 400 });
  }

  const { id, dueDate, ...updates } = data;
  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      ...updates,
      ...(dueDate !== undefined ? { dueAt: dueDate ? new Date(dueDate) : null } : {}),
      activities: {
        create: {
          actorId: currentUser.id,
          action: "updated",
          details: [updates.status, updates.priority, updates.title].filter(Boolean).join(" · ") || "Task details changed",
        },
      },
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      community: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
    },
  });
  if (data.assigneeId && data.assigneeId !== currentUser.id && data.assigneeId !== task.assigneeId) {
    await createNotification(prisma, {
      userId: data.assigneeId,
      type: "task-assignment",
      message: `You were assigned: ${updatedTask.title}`,
      href: "/tasks",
    });
  }
  return NextResponse.json({ task: updatedTask });
}
