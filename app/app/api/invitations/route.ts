import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const invitations = await prisma.communityInvitation.findMany({
    where: { inviteeId: currentUser.id },
    include: {
      community: { select: { id: true, name: true, goal: true, maxMembers: true, _count: { select: { members: true } } } },
      inviter: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ invitations });
}
