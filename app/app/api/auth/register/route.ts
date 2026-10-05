import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth";
import { getStore } from "@/lib/database-store";
import { serializeUser } from "@/lib/users";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.(edu|ac\.in|edu\.in)$/i),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Use your college email, a name with at least 2 characters, and a password of at least 8 characters." },
      { status: 400 }
    );
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const newUser = await getStore().atomic(async (store) => {
      const existing = await store.list("users", [["email", "==", parsed.data.email]]);
      if (existing.length) throw Object.assign(new Error("Email already registered."), { code: "P2002" });
      return store.create("users", {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        college: "",
        department: "",
        onboardingComplete: false,
        skills: ["Frontend"],
      });
    });

    const token = await createSessionToken(newUser.id);
    const response = NextResponse.json({ user: serializeUser(newUser) }, { status: 201 });
    response.cookies.set("intentlink_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error.code === "P2002" || error.code === 11000)) {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    }
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorCode = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const errorMessage = error instanceof Error ? error.message : "";
    console.error("Registration service failed:", errorName, errorCode);
    const authenticationRejected = /bad auth|authentication failed/i.test(errorMessage) || ["18", "8000"].includes(errorCode);
    const publicError = authenticationRejected
      ? "MongoDB Atlas rejected the database login. Check the database user and password in MONGODB_URI."
      : /MongoServerSelectionError|MongoNetworkError|ECONN|ENOTFOUND|timeout/i.test(`${errorName} ${errorCode}`)
      ? "Vercel cannot reach MongoDB Atlas. Check Atlas Network Access and the Production MONGODB_URI."
      : "Registration could not be completed. Check the database configuration and server logs.";
    return NextResponse.json(
      { error: publicError },
      { status: 503 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
