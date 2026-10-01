import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const sendSchema = z.object({
  recipientId: z.number().int().positive(),
  message: z.string().trim().min(1).max(2000),
});

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conversations = await prisma.conversation.findMany({
    where: { kind: "direct", members: { some: { userId: currentUser.id } } },
    include: {
      community: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
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

  const recipient = await prisma.user.findUnique({ where: { id: parsed.data.recipientId } });
  if (!recipient) return NextResponse.json({ error: "Student not found." }, { status: 404 });
  const [connection, sharedCommunity] = await Promise.all([
    prisma.collaborationRequest.findFirst({
      where: {
        status: "accepted",
        OR: [
          { senderId: currentUser.id, receiverId: recipient.id },
          { senderId: recipient.id, receiverId: currentUser.id },
        ],
      },
    }),
    prisma.communityMember.findFirst({
      where: {
        userId: currentUser.id,
        community: { members: { some: { userId: recipient.id } } },
      },
    }),
  ]);
  if (!connection && !sharedCommunity) {
    return NextResponse.json({ error: "You can message students after connecting or joining the same team." }, { status: 403 });
  }

  const result = await prisma.$transaction(async (transaction) => {
    let conversation = await transaction.conversation.findFirst({
      where: {
        kind: "direct",
        communityId: null,
        members: { some: { userId: currentUser.id } },
        AND: [{ members: { some: { userId: recipient.id } } }],
      },
      include: { members: true },
    });
    if (!conversation || conversation.members.length !== 2) {
      conversation = await transaction.conversation.create({
        data: {
          kind: "direct",
          members: { create: [{ userId: currentUser.id }, { userId: recipient.id }] },
        },
        include: { members: true },
      });
    }
    const message = await transaction.message.create({
      data: { conversationId: conversation.id, senderId: currentUser.id, body: parsed.data.message },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });
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
