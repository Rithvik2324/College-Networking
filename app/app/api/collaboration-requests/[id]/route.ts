import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
import { userSummary } from "@/lib/views";
import { ensureDirectConversation } from "@/lib/conversations";
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

  const collaborationRequest = await getStore().get("collaborationRequests", id);
  if (!collaborationRequest) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (collaborationRequest.receiverId !== currentUser.id) {
    return NextResponse.json({ error: "Only the invited student can respond." }, { status: 403 });
  }
  if (collaborationRequest.status !== "pending") {
    return NextResponse.json({ error: "This request has already been answered." }, { status: 409 });
  }

  const outcome = await getStore().atomic(async (transaction) => {
    const latest = await transaction.get("collaborationRequests", id);
    if (!latest || latest.status !== "pending") return { error: "This request has already been answered." };
    const result = await transaction.update("collaborationRequests", id, { status: parsed.data.status });
    await createNotification(transaction, {
        userId: collaborationRequest.senderId,
        type: `collaboration-${parsed.data.status}`,
        message: `${currentUser.name} ${parsed.data.status} your collaboration request.`,
        href: "/discover?tab=requests",
    });

    if (parsed.data.status === "accepted") {
      await ensureDirectConversation(transaction, collaborationRequest.senderId, collaborationRequest.receiverId);
    }
    return { request: { ...result, sender: await userSummary(transaction, result.senderId) } };
  });
  if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: 409 });
  return NextResponse.json({ request: outcome.request });
}
