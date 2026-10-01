import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  goal: z.string().trim().min(5).max(240).optional(),
  description: z.string().trim().max(1000).optional(),
  stage: z.enum(["Create", "Execute", "Complete", "Archive"]).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Community not found." }, { status: 404 });

  const community = await prisma.community.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: {
        include: { user: { select: { id: true, name: true, avatarUrl: true, primarySkill: true, department: true } } },
        orderBy: { joinedAt: "asc" },
      },
      tasks: { orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }] },
      invitations: { where: { status: "pending" }, select: { inviteeId: true } },
    },
  });
  if (!community || (community.isPrivate && !community.members.some(({ userId }) => userId === currentUser.id))) {
    return NextResponse.json({ error: "Community not found." }, { status: 404 });
  }
  return NextResponse.json({ community });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await context.params).id);
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(id) || id < 1 || !parsed.success) {
    return NextResponse.json({ error: "Check the community details and try again." }, { status: 400 });
  }
  const community = await prisma.community.findUnique({ where: { id } });
  if (!community) return NextResponse.json({ error: "Community not found." }, { status: 404 });
  if (community.ownerId !== currentUser.id) return NextResponse.json({ error: "Only the owner can update this community." }, { status: 403 });

  const updated = await prisma.community.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ community: updated });
}
