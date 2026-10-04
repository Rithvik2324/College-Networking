import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
import { userSummary } from "@/lib/views";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = getStore();
  const records = (await store.list("communityInvitations", [["inviteeId", "==", currentUser.id]]))
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
  const invitations = await Promise.all(records.map(async (invitation) => {
    const community = await store.get("communities", invitation.communityId);
    const members = await store.list("communityMembers", [["communityId", "==", invitation.communityId]]);
    return { ...invitation, inviter: await userSummary(store, invitation.inviterId), community: community
      ? { id: community.id, name: community.name, goal: community.goal, maxMembers: community.maxMembers, _count: { members: members.length } } : null };
  }));
  return NextResponse.json({ invitations });
}
