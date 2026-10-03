import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
import { ensureCommunityConversation } from "@/lib/conversations";
import { messageView } from "@/lib/views";
import { z } from "zod";

const messageSchema = z.object({
  communityId: z.coerce.number().int().positive(),
  text: z.string().trim().min(1).max(2000),
});

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const communityId = Number(searchParams.get("communityId"));
  if (!Number.isInteger(communityId) || communityId < 1) {
    return NextResponse.json({ error: "A valid community is required." }, { status: 400 });
  }

  const store = getStore();
  const membership = await store.get("communityMembers", `${communityId}_${currentUser.id}`);
  if (!membership) return NextResponse.json({ error: "Join this community to view its messages." }, { status: 403 });

  const [conversation] = await store.list("conversations", [["communityId", "==", communityId], ["kind", "==", "community"]]);
  if (!conversation) return NextResponse.json({ messages: [] });

  const records = (await store.list("messages", [["conversationId", "==", conversation.id]]))
    .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime());
  const messages = await Promise.all(records.map((message) => messageView(store, message)));
  await store.atomic(async (transaction) => {
    const key = `${conversation.id}_${currentUser.id}`;
    if (!(await transaction.get("conversationMembers", key))) {
      await transaction.create("conversationMembers", { conversationId: conversation.id, userId: currentUser.id });
    }
    await transaction.update("conversationMembers", key, { lastReadAt: new Date() });
  });
  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a message before sending." }, { status: 400 });
  }

  const store = getStore();
  const membership = await store.get("communityMembers", `${parsed.data.communityId}_${currentUser.id}`);
  if (!membership) return NextResponse.json({ error: "Join this community to send messages." }, { status: 403 });

  const message = await store.atomic(async (transaction) => {
    if (!(await transaction.get("communityMembers", `${parsed.data.communityId}_${currentUser.id}`))) throw new Error("Community access changed.");
    const conversation = await ensureCommunityConversation(transaction, parsed.data.communityId);
    const created = await transaction.create("messages", {
      conversationId: conversation.id,
      senderId: currentUser.id,
      body: parsed.data.text,
    });
    return messageView(transaction, created);
  });

  return NextResponse.json({ message }, { status: 201 });
}
