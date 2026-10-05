import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
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
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    }
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Registration service failed:", detail);
    let publicError = "Registration service is unavailable. Check the Vercel function logs for the Firestore error.";
    if (detail.includes("Firestore is not ready")) {
      publicError = "Firestore is connected, but this database has not been initialized. Run the one-time Firestore migration for this project.";
    } else if (detail.includes("FIREBASE_SERVICE_ACCOUNT_JSON")) {
      publicError = "The server Firebase service-account setting is missing or invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.";
    } else if (/credential|private key|service account|default credentials|Could not load the default/i.test(detail)) {
      publicError = "The server Firebase credentials are missing or invalid. Configure FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.";
    } else if (/PERMISSION_DENIED|permission denied|insufficient permissions|Missing or insufficient permissions/i.test(detail)) {
      publicError = "The Firebase service account lacks access to Cloud Firestore. Grant it the Cloud Datastore User role in Google Cloud IAM.";
    } else if (/NOT_FOUND|NOT_FOUND|database.*not found/i.test(detail)) {
      publicError = "Cloud Firestore is not enabled for the Firebase project configured on the server.";
    }
    return NextResponse.json(
      { error: publicError },
      { status: 503 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
