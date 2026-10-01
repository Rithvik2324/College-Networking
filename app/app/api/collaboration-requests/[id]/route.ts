import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const responseSchema = z.object({ status: z.enum(["accepted", "rejected"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const parsed = responseSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(id) || id < 1 || !parsed.success) {
    return NextResponse.json({ error: "Invalid collaboration request update." }, { status: 400 });
  }

  const collaborationRequest = await prisma.collaborationRequest.findUnique({ where: { id } });
  if (!collaborationRequest) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (collaborationRequest.receiverId !== currentUser.id) {
    return NextResponse.json({ error: "Only the invited student can respond." }, { status: 403 });
  }
  if (collaborationRequest.status !== "pending") {
    return NextResponse.json({ error: "This request has already been answered." }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const result = await transaction.collaborationRequest.update({
      where: { id },
      data: { status: parsed.data.status },
      include: { sender: { select: { id: true, name: true } } },
    });
    await createNotification(transaction, {
        userId: collaborationRequest.senderId,
        type: `collaboration-${parsed.data.status}`,
        message: `${currentUser.name} ${parsed.data.status} your collaboration request.`,
        href: "/discover?tab=requests",
    });

    if (parsed.data.status === "accepted") {
      let conversation = await transaction.conversation.findFirst({
        where: {
          kind: "direct",
          communityId: null,
          members: { some: { userId: collaborationRequest.senderId } },
          AND: [{ members: { some: { userId: collaborationRequest.receiverId } } }],
        },
        include: { members: true },
      });
      if (!conversation || conversation.members.length !== 2) {
        conversation = await transaction.conversation.create({
          data: {
            kind: "direct",
            members: {
              create: [
                { userId: collaborationRequest.senderId },
                { userId: collaborationRequest.receiverId },
              ],
            },
          },
          include: { members: true },
        });
      }
    }
    return result;
  });

  return NextResponse.json({ request: updated });
}
