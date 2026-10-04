import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
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

  const invitation = await getStore().get("communityInvitations", invitationId);
  if (!invitation) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  if (invitation.inviteeId !== currentUser.id) return NextResponse.json({ error: "Only the invited student can respond." }, { status: 403 });
  if (invitation.status !== "pending") return NextResponse.json({ error: "This invitation has already been answered." }, { status: 409 });

  const result = await getStore().atomic(async (transaction) => {
    const latest = await transaction.get("communityInvitations", invitationId);
    if (!latest || latest.status !== "pending") return { error: "This invitation has already been answered.", status: 409 as const };
    const community = await transaction.get("communities", invitation.communityId);
    if (!community) return { error: "Community not found.", status: 404 as const };
    if (parsed.data.status === "accepted") {
      const members = await transaction.list("communityMembers", [["communityId", "==", invitation.communityId]]);
      const existing = await transaction.get("communityMembers", `${invitation.communityId}_${currentUser.id}`);
      if (!existing && members.length >= community.maxMembers) {
        return { error: "The team is full. Ask the owner for another opportunity.", status: 409 as const };
      }
      if (!existing) await transaction.create("communityMembers", { communityId: invitation.communityId, userId: currentUser.id });
      await transaction.update("communities", invitation.communityId, {});
    }

    const updated = await transaction.update("communityInvitations", invitationId, { status: parsed.data.status });
    await createNotification(transaction, {
        userId: invitation.inviterId,
        type: `invitation-${parsed.data.status}`,
        message: `${currentUser.name} ${parsed.data.status} the invitation to ${community.name}.`,
        href: "/communities",
    });
    return { invitation: updated, status: 200 as const };
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ invitation: result.invitation });
}
