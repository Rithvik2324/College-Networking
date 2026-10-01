import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const inviteSchema = z.object({ inviteeId: z.number().int().positive() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const communityId = Number((await context.params).id);
  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(communityId) || communityId < 1 || !parsed.success) {
    return NextResponse.json({ error: "Choose a valid student to invite." }, { status: 400 });
  }

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    include: { _count: { select: { members: true } } },
  });
  if (!community) return NextResponse.json({ error: "Community not found." }, { status: 404 });

  const actorMembership = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId: currentUser.id } },
  });
  if (!actorMembership || !["owner", "lead"].includes(actorMembership.role)) {
    return NextResponse.json({ error: "Only team owners and leads can invite students." }, { status: 403 });
  }
  if (community._count.members >= community.maxMembers) {
    return NextResponse.json({ error: `This team has reached its ${community.maxMembers}-member limit.` }, { status: 409 });
  }
  const invitee = await prisma.user.findUnique({ where: { id: parsed.data.inviteeId } });
  if (!invitee || invitee.id === currentUser.id) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const [membership, pending] = await Promise.all([
    prisma.communityMember.findUnique({ where: { communityId_userId: { communityId, userId: invitee.id } } }),
    prisma.communityInvitation.findFirst({
      where: { communityId, inviteeId: invitee.id, status: "pending" },
    }),
  ]);
  if (membership) return NextResponse.json({ error: "This student is already a member." }, { status: 409 });
  if (pending) return NextResponse.json({ error: "An invitation is already pending." }, { status: 409 });

  const invitation = await prisma.$transaction(async (transaction) => {
    const created = await transaction.communityInvitation.create({
      data: { communityId, inviterId: currentUser.id, inviteeId: invitee.id },
    });
    await createNotification(transaction, {
        userId: invitee.id,
        type: "team-invitation",
        message: `${currentUser.name} invited you to ${community.name}.`,
        href: "/invitations",
    });
    return created;
  });
  return NextResponse.json({ invitation }, { status: 201 });
}
