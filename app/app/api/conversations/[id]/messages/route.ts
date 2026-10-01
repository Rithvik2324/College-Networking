import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const messageSchema = z.object({ message: z.string().trim().min(1).max(2000) });

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conversationId = Number((await context.params).id);
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: currentUser.id } },
  });
  if (!membership) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId: currentUser.id } },
    data: { lastReadAt: new Date() },
  });
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
  const conversationMember = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: currentUser.id } },
    include: { conversation: { include: { members: true } } },
  });
  if (!conversationMember) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const message = await prisma.message.create({
    data: { conversationId, senderId: currentUser.id, body: parsed.data.message },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });
  const recipientIds = conversationMember.conversation.members
    .map(({ userId }) => userId)
    .filter((userId) => userId !== currentUser.id);
  await Promise.all(recipientIds.map((userId) =>
    createNotification(prisma, {
        userId,
        type: "message",
        message: `New message from ${currentUser.name}.`,
        href: "/messages",
    })
  ));
  return NextResponse.json({ message }, { status: 201 });
}
