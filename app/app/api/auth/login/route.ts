import { NextResponse } from "next/server";
import { createSessionToken, getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/database-store";
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

  try {
    const email = parsed.data.email.trim().toLowerCase();
    const [user] = await getStore().list("users", [["email", "==", email]]);

    if (!user || !(await comparePassword(parsed.data.password, user.passwordHash))) {
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
  } catch (error) {
    console.error("Login service failed:", error);
    return NextResponse.json(
      { error: "Sign-in service is unavailable. Check the database connection and try again." },
      { status: 503 },
    );
  }
}

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user: user ?? null });
}
