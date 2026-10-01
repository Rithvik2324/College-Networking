import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
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

  await prisma.notification.updateMany({
    where: {
      userId: currentUser.id,
      ...(parsed.data.markAll ? {} : { id: { in: parsed.data.ids || [] } }),
    },
    data: { isRead: true },
  });
  return NextResponse.json({ ok: true });
}
