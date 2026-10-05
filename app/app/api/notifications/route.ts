import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/database-store";
import { z } from "zod";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = (await getStore().list("notifications", [["userId", "==", currentUser.id]]))
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime()).slice(0, 50);
  return NextResponse.json({ notifications: notifications.map((entry) => ({ ...entry, read: entry.isRead })) });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = z.object({
    ids: z.array(z.number().int().positive()).optional(),
    markAll: z.boolean().optional(),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification update." }, { status: 400 });

  await getStore().atomic(async (store) => {
    const notifications = await store.list("notifications", [["userId", "==", currentUser.id]]);
    for (const notification of notifications) {
      if (parsed.data.markAll || parsed.data.ids?.includes(notification.id)) {
        await store.update("notifications", notification.id, { isRead: true });
      }
    }
  });
  return NextResponse.json({ ok: true });
}
