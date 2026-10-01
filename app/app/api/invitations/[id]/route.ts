import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const responseSchema = z.object({ status: z.enum(["accepted", "rejected"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const invitationId = Number((await context.params).id);
  const parsed = responseSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(invitationId) || invitationId < 1 || !parsed.success) {
    return NextResponse.json({ error: "Invalid invitation response." }, { status: 400 });
  }

  const invitation = await prisma.communityInvitation.findUnique({
    where: { id: invitationId },
    include: { community: { select: { name: true, maxMembers: true, _count: { select: { members: true } } } } },
  });
  if (!invitation) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  if (invitation.inviteeId !== currentUser.id) return NextResponse.json({ error: "Only the invited student can respond." }, { status: 403 });
  if (invitation.status !== "pending") return NextResponse.json({ error: "This invitation has already been answered." }, { status: 409 });

  const result = await prisma.$transaction(async (transaction) => {
    if (parsed.data.status === "accepted") {
      const community = await transaction.community.findUnique({
        where: { id: invitation.communityId },
        include: { _count: { select: { members: true } } },
      });
      if (!community || community._count.members >= community.maxMembers) {
        return { error: "The team is full. Ask the owner for another opportunity.", status: 409 as const };
      }
      await transaction.communityMember.upsert({
        where: { communityId_userId: { communityId: invitation.communityId, userId: currentUser.id } },
        update: {},
        create: { communityId: invitation.communityId, userId: currentUser.id },
      });
    }

    const updated = await transaction.communityInvitation.update({
      where: { id: invitationId },
      data: { status: parsed.data.status },
    });
    await createNotification(transaction, {
        userId: invitation.inviterId,
        type: `invitation-${parsed.data.status}`,
        message: `${currentUser.name} ${parsed.data.status} the invitation to ${invitation.community.name}.`,
        href: "/communities",
    });
    return { invitation: updated, status: 200 as const };
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ invitation: result.invitation });
}
