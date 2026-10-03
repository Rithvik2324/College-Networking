import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
import { ensureDirectConversation } from "@/lib/conversations";
import { userSummary, messageView } from "@/lib/views";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const sendSchema = z.object({
  recipientId: z.number().int().positive(),
  message: z.string().trim().min(1).max(2000),
});

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = getStore();
  const memberships = await store.list("conversationMembers", [["userId", "==", currentUser.id]]);
  const records = (await Promise.all(memberships.map((member) => store.get("conversations", member.conversationId))))
    .filter((conversation): conversation is NonNullable<typeof conversation> => conversation !== null && conversation.kind === "direct")
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
  const conversations = await Promise.all(records.map(async (conversation) => {
    const members = await Promise.all((await store.list("conversationMembers", [["conversationId", "==", conversation.id]]))
      .map(async (member) => ({ ...member, user: await userSummary(store, member.userId) })));
    const latest = (await store.list("messages", [["conversationId", "==", conversation.id]]))
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())[0];
    return { ...conversation, community: null, members, messages: latest ? [await messageView(store, latest)] : [] };
  }));
  return NextResponse.json({
    conversations: conversations.map((conversation) => ({
      ...conversation,
      otherMembers: conversation.members.filter(({ userId }) => userId !== currentUser.id).map(({ user }) => user),
      latestMessage: conversation.messages[0] || null,
    })),
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = sendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.recipientId === currentUser.id) {
    return NextResponse.json({ error: "Choose a connected student and enter a message." }, { status: 400 });
  }

  const store = getStore();
  const recipient = await store.get("users", parsed.data.recipientId);
  if (!recipient) return NextResponse.json({ error: "Student not found." }, { status: 404 });
  const connections = [
    ...await store.list("collaborationRequests", [["senderId", "==", currentUser.id], ["receiverId", "==", recipient.id], ["status", "==", "accepted"]]),
    ...await store.list("collaborationRequests", [["senderId", "==", recipient.id], ["receiverId", "==", currentUser.id], ["status", "==", "accepted"]]),
  ];
  const ownTeams = await store.list("communityMembers", [["userId", "==", currentUser.id]]);
  const recipientTeams = await store.list("communityMembers", [["userId", "==", recipient.id]]);
  const connection = connections.length > 0;
  const sharedCommunity = ownTeams.some((team) => recipientTeams.some((other) => other.communityId === team.communityId));
  if (!connection && !sharedCommunity) {
    return NextResponse.json({ error: "You can message students after connecting or joining the same team." }, { status: 403 });
  }

  const result = await store.atomic(async (transaction) => {
    const conversation = await ensureDirectConversation(transaction, currentUser.id, recipient.id);
    const created = await transaction.create("messages", { conversationId: conversation.id, senderId: currentUser.id, body: parsed.data.message });
    const message = await messageView(transaction, created);
    await createNotification(transaction, {
      userId: recipient.id,
      type: "message",
      message: `New message from ${currentUser.name}.`,
      href: "/messages",
    });
    return { conversationId: conversation.id, message };
  });
  return NextResponse.json(result, { status: 201 });
}
