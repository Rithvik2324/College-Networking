import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  const membership = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId: currentUser.id } },
  });
  if (!membership) return NextResponse.json({ error: "Join this community to view its messages." }, { status: 403 });

  const conversation = await prisma.conversation.findFirst({ where: { communityId, kind: "community" } });
  if (!conversation) return NextResponse.json({ messages: [] });

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });
  await prisma.conversationMember.updateMany({
    where: { conversationId: conversation.id, userId: currentUser.id },
    data: { lastReadAt: new Date() },
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

  const membership = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId: parsed.data.communityId, userId: currentUser.id } },
  });
  if (!membership) return NextResponse.json({ error: "Join this community to send messages." }, { status: 403 });

  let conversation = await prisma.conversation.findFirst({
    where: { communityId: parsed.data.communityId, kind: "community" },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        kind: "community",
        communityId: parsed.data.communityId,
        members: { create: { userId: currentUser.id } },
      },
    });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: currentUser.id,
      body: parsed.data.text,
    },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}
