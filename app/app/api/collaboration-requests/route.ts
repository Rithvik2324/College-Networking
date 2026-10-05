import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/database-store";
import { userSummary } from "@/lib/views";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const createRequestSchema = z.object({
  receiverId: z.number().int().positive(),
  message: z.string().trim().max(500).optional(),
});

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = getStore();
  const records = [
    ...await store.list("collaborationRequests", [["senderId", "==", currentUser.id]]),
    ...await store.list("collaborationRequests", [["receiverId", "==", currentUser.id]]),
  ].sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
  const requests = await Promise.all(records.map(async (item) => ({ ...item,
    sender: await userSummary(store, item.senderId), receiver: await userSummary(store, item.receiverId),
  })));
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.receiverId === currentUser.id) {
    return NextResponse.json({ error: "Choose another student to connect with." }, { status: 400 });
  }

  const receiver = await getStore().get("users", parsed.data.receiverId);
  if (!receiver?.onboardingComplete) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const result = await getStore().atomic(async (transaction) => {
    const existing = [
      ...await transaction.list("collaborationRequests", [["senderId", "==", currentUser.id], ["receiverId", "==", receiver.id]]),
      ...await transaction.list("collaborationRequests", [["senderId", "==", receiver.id], ["receiverId", "==", currentUser.id]]),
    ].some((item) => ["pending", "accepted"].includes(item.status));
    if (existing) return { error: "A request or connection already exists." };
    const created = await transaction.create("collaborationRequests", {
        senderId: currentUser.id,
        receiverId: receiver.id,
        message: parsed.data.message || "",
    });
    await createNotification(transaction, {
        userId: receiver.id,
        type: "collaboration-request",
        message: `${currentUser.name} would like to collaborate with you.`,
        href: "/discover?tab=requests",
    });
    return { request: created };
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ request: result.request }, { status: 201 });
}
