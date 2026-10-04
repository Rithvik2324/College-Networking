import { NextResponse } from "next/server";
import { createSessionToken, getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
import { serializeUser } from "@/lib/users";
import { comparePassword } from "@/lib/password";
import { z } from "zod";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(72),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const [user] = await getStore().list("users", [["email", "==", email]]);

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await comparePassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await createSessionToken(user.id);
  const response = NextResponse.json({ user: serializeUser(user) });
  response.cookies.set("intentlink_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user: user ?? null });
}
