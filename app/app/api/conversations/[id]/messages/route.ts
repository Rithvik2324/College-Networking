import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
import { conversationAccess } from "@/lib/conversations";
import { messageView } from "@/lib/views";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const messageSchema = z.object({ message: z.string().trim().min(1).max(2000) });

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conversationId = Number((await context.params).id);
  if (!Number.isInteger(conversationId) || conversationId < 1) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const store = getStore();
  const membership = await conversationAccess(store, conversationId, currentUser.id);
  if (!membership) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const records = (await store.list("messages", [["conversationId", "==", conversationId]]))
    .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime()).slice(0, 200);
  const messages = await Promise.all(records.map((message) => messageView(store, message)));
  await store.update("conversationMembers", `${conversationId}_${currentUser.id}`, { lastReadAt: new Date() });
  return NextResponse.json({ messages });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conversationId = Number((await context.params).id);
  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(conversationId) || conversationId < 1 || !parsed.success) {
    return NextResponse.json({ error: "Enter a valid message." }, { status: 400 });
  }
  const store = getStore();
  const conversationMember = await conversationAccess(store, conversationId, currentUser.id);
  if (!conversationMember) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const message = await store.atomic(async (transaction) => {
    if (!(await conversationAccess(transaction, conversationId, currentUser.id))) throw new Error("Conversation access changed.");
    const created = await transaction.create("messages", { conversationId, senderId: currentUser.id, body: parsed.data.message });
    const members = await transaction.list("conversationMembers", [["conversationId", "==", conversationId]]);
    for (const { userId } of members) {
      if (userId === currentUser.id) continue;
      if (conversationMember.conversation.communityId && !(await transaction.get("communityMembers", `${conversationMember.conversation.communityId}_${userId}`))) continue;
      await createNotification(transaction, {
        userId,
        type: "message",
        message: `New message from ${currentUser.name}.`,
        href: "/messages",
      });
    }
    return messageView(transaction, created);
  });
  return NextResponse.json({ message }, { status: 201 });
}
