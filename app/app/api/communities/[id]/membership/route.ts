import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const communityId = Number((await context.params).id);
  if (!Number.isInteger(communityId) || communityId < 1) return NextResponse.json({ error: "Community not found." }, { status: 404 });

  const result = await prisma.$transaction(async (transaction) => {
    const community = await transaction.community.findUnique({
      where: { id: communityId },
      include: { _count: { select: { members: true } } },
    });
    if (!community || community.isPrivate) return { error: "This community is not open to join.", status: 404 as const };

    const existing = await transaction.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: currentUser.id } },
    });
    if (existing) return { error: "You are already a member.", status: 409 as const };
    if (community._count.members >= community.maxMembers) {
      return { error: `This team has reached its ${community.maxMembers}-member limit.`, status: 409 as const };
    }

    const membership = await transaction.communityMember.create({
      data: { communityId, userId: currentUser.id },
    });
    await createNotification(transaction, {
        userId: community.ownerId,
        type: "community-member-joined",
        message: `${currentUser.name} joined ${community.name}.`,
        href: "/communities",
    });
    return { membership, status: 201 as const };
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ membership: result.membership }, { status: 201 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const communityId = Number((await context.params).id);
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  if (!community) return NextResponse.json({ error: "Community not found." }, { status: 404 });
  if (community.ownerId === currentUser.id) {
    return NextResponse.json({ error: "The owner must transfer ownership before leaving." }, { status: 403 });
  }

  await prisma.communityMember.deleteMany({ where: { communityId, userId: currentUser.id } });
  return NextResponse.json({ ok: true });
}
