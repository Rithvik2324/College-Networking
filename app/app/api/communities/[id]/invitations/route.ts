import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
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

  const store = getStore();
  const community = await store.get("communities", communityId);
  if (!community) return NextResponse.json({ error: "Community not found." }, { status: 404 });

  const actorMembership = await store.get("communityMembers", `${communityId}_${currentUser.id}`);
  if (!actorMembership || !["owner", "lead"].includes(actorMembership.role)) {
    return NextResponse.json({ error: "Only team owners and leads can invite students." }, { status: 403 });
  }
  if ((await store.list("communityMembers", [["communityId", "==", communityId]])).length >= community.maxMembers) {
    return NextResponse.json({ error: `This team has reached its ${community.maxMembers}-member limit.` }, { status: 409 });
  }
  const invitee = await store.get("users", parsed.data.inviteeId);
  if (!invitee || invitee.id === currentUser.id) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const [membership, pending] = await Promise.all([
    store.get("communityMembers", `${communityId}_${invitee.id}`),
    store.list("communityInvitations", [["communityId", "==", communityId], ["inviteeId", "==", invitee.id], ["status", "==", "pending"]]),
  ]);
  if (membership) return NextResponse.json({ error: "This student is already a member." }, { status: 409 });
  if (pending.length) return NextResponse.json({ error: "An invitation is already pending." }, { status: 409 });

  const invitation = await store.atomic(async (transaction) => {
    const duplicate = await transaction.list("communityInvitations", [["communityId", "==", communityId], ["inviteeId", "==", invitee.id], ["status", "==", "pending"]]);
    if (duplicate.length) return duplicate[0];
    const created = await transaction.create("communityInvitations", { communityId, inviterId: currentUser.id, inviteeId: invitee.id });
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
