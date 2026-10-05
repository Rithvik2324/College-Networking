import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/database-store";
import { createNotification } from "@/lib/notifications";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const communityId = Number((await context.params).id);
  if (!Number.isInteger(communityId) || communityId < 1) return NextResponse.json({ error: "Community not found." }, { status: 404 });

  const result = await getStore().atomic(async (transaction) => {
    const community = await transaction.get("communities", communityId);
    if (!community || community.isPrivate) return { error: "This community is not open to join.", status: 404 as const };

    const existing = await transaction.get("communityMembers", `${communityId}_${currentUser.id}`);
    if (existing) return { error: "You are already a member.", status: 409 as const };
    const members = await transaction.list("communityMembers", [["communityId", "==", communityId]]);
    if (members.length >= community.maxMembers) {
      return { error: `This team has reached its ${community.maxMembers}-member limit.`, status: 409 as const };
    }

    const membership = await transaction.create("communityMembers", { communityId, userId: currentUser.id });
    await transaction.update("communities", communityId, {});
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
  if (!Number.isInteger(communityId) || communityId < 1) return NextResponse.json({ error: "Community not found." }, { status: 404 });
  const community = await getStore().get("communities", communityId);
  if (!community) return NextResponse.json({ error: "Community not found." }, { status: 404 });
  if (community.ownerId === currentUser.id) {
    return NextResponse.json({ error: "The owner must transfer ownership before leaving." }, { status: 403 });
  }

  await getStore().atomic(async (store) => {
    await store.get("communities", communityId);
    await store.remove("communityMembers", `${communityId}_${currentUser.id}`);
    await store.update("communities", communityId, {});
  });
  return NextResponse.json({ ok: true });
}
