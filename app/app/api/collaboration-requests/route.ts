import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const createRequestSchema = z.object({
  receiverId: z.number().int().positive(),
  message: z.string().trim().max(500).optional(),
});

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.collaborationRequest.findMany({
    where: { OR: [{ senderId: currentUser.id }, { receiverId: currentUser.id }] },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true, department: true } },
      receiver: { select: { id: true, name: true, avatarUrl: true, department: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.receiverId === currentUser.id) {
    return NextResponse.json({ error: "Choose another student to connect with." }, { status: 400 });
  }

  const receiver = await prisma.user.findUnique({ where: { id: parsed.data.receiverId, onboardingComplete: true } });
  if (!receiver) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const existing = await prisma.collaborationRequest.findFirst({
    where: {
      OR: [
        { senderId: currentUser.id, receiverId: receiver.id },
        { senderId: receiver.id, receiverId: currentUser.id },
      ],
      status: { in: ["pending", "accepted"] },
    },
  });
  if (existing) return NextResponse.json({ error: "A request or connection already exists." }, { status: 409 });

  const collaborationRequest = await prisma.$transaction(async (transaction) => {
    const created = await transaction.collaborationRequest.create({
      data: {
        senderId: currentUser.id,
        receiverId: receiver.id,
        message: parsed.data.message || "",
      },
    });
    await createNotification(transaction, {
        userId: receiver.id,
        type: "collaboration-request",
        message: `${currentUser.name} would like to collaborate with you.`,
        href: "/discover?tab=requests",
    });
    return created;
  });

  return NextResponse.json({ request: collaborationRequest }, { status: 201 });
}
