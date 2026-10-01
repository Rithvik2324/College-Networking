import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  category: z.string().trim().min(2).max(60).optional(),
  status: z.enum(["Idea", "Looking for teammates", "Building", "Launched", "Paused"]).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true, primarySkill: true } } } },
      requiredSkills: { include: { skill: true } },
      tasks: { orderBy: { dueAt: "asc" } },
      joinRequests: {
        where: { applicantId: currentUser.id },
        select: { id: true, status: true },
      },
    },
  });
  if (!project || (project.visibility !== "public" && !project.members.some(({ userId }) => userId === currentUser.id))) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await context.params).id);
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(id) || id < 1 || !parsed.success) {
    return NextResponse.json({ error: "Check the project updates and try again." }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (project.ownerId !== currentUser.id) return NextResponse.json({ error: "Only the project owner can edit it." }, { status: 403 });

  const updated = await prisma.project.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ project: updated });
}
