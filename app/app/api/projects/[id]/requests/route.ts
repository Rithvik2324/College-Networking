import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const responseSchema = z.object({
  requestId: z.number().int().positive(),
  status: z.enum(["accepted", "rejected"]),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = Number((await context.params).id);
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (project.ownerId !== currentUser.id) return NextResponse.json({ error: "Only the owner can review requests." }, { status: 403 });

  const requests = await prisma.projectJoinRequest.findMany({
    where: { projectId },
    include: { applicant: { select: { id: true, name: true, avatarUrl: true, primarySkill: true, department: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = Number((await context.params).id);
  if (!Number.isInteger(projectId) || projectId < 1) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.visibility !== "public") return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (project.ownerId === currentUser.id) return NextResponse.json({ error: "You already own this project." }, { status: 409 });
  const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: currentUser.id } } });
  if (member) return NextResponse.json({ error: "You are already a project member." }, { status: 409 });

  const existing = await prisma.projectJoinRequest.findFirst({
    where: { projectId, applicantId: currentUser.id, status: "pending" },
  });
  if (existing) return NextResponse.json({ error: "Your request is already pending." }, { status: 409 });

  const joinRequest = await prisma.$transaction(async (transaction) => {
    const created = await transaction.projectJoinRequest.create({
      data: { projectId, applicantId: currentUser.id },
    });
    await createNotification(transaction, {
        userId: project.ownerId,
        type: "project-join-request",
        message: `${currentUser.name} requested to join ${project.title}.`,
        href: `/projects/${projectId}`,
    });
    return created;
  });
  return NextResponse.json({ request: joinRequest }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = Number((await context.params).id);
  const parsed = responseSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(projectId) || projectId < 1 || !parsed.success) {
    return NextResponse.json({ error: "Invalid join request update." }, { status: 400 });
  }

  const [project, joinRequest] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.projectJoinRequest.findUnique({ where: { id: parsed.data.requestId } }),
  ]);
  if (!project || !joinRequest || joinRequest.projectId !== projectId) {
    return NextResponse.json({ error: "Join request not found." }, { status: 404 });
  }
  if (project.ownerId !== currentUser.id) return NextResponse.json({ error: "Only the owner can review requests." }, { status: 403 });
  if (joinRequest.status !== "pending") return NextResponse.json({ error: "This request has already been answered." }, { status: 409 });

  const result = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.projectJoinRequest.update({
      where: { id: joinRequest.id },
      data: { status: parsed.data.status, reviewerId: currentUser.id },
    });
    if (parsed.data.status === "accepted") {
      await transaction.projectMember.upsert({
        where: { projectId_userId: { projectId, userId: joinRequest.applicantId } },
        update: {},
        create: { projectId, userId: joinRequest.applicantId },
      });
    }
    await createNotification(transaction, {
        userId: joinRequest.applicantId,
        type: `project-request-${parsed.data.status}`,
        message: `Your request to join ${project.title} was ${parsed.data.status}.`,
        href: `/projects/${projectId}`,
    });
    return updated;
  });
  return NextResponse.json({ request: result });
}
