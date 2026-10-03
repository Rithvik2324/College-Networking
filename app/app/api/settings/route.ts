import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
import { comparePassword, hashPassword } from "@/lib/password";
import { z } from "zod";

const settingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  currentPassword: z.string().min(1).max(72).optional(),
  newPassword: z.string().min(8).max(72).optional(),
});

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getStore().get("users", currentUser.id);
  return NextResponse.json({ settings: user ? { email: user.email, notificationsEnabled: user.notificationsEnabled, college: user.college } : null });
}

export async function PUT(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the settings fields and try again." }, { status: 400 });

  const { currentPassword, newPassword, notificationsEnabled } = parsed.data;
  if (newPassword && !currentPassword) {
    return NextResponse.json({ error: "Enter your current password to change it." }, { status: 400 });
  }
  const user = await getStore().get("users", currentUser.id);
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (newPassword && !(await comparePassword(currentPassword || "", user.passwordHash))) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
  }

  await getStore().update("users", currentUser.id, {
      ...(notificationsEnabled !== undefined ? { notificationsEnabled } : {}),
      ...(newPassword ? { passwordHash: await hashPassword(newPassword) } : {}),
  });
  return NextResponse.json({ ok: true });
}
