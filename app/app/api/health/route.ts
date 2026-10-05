import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/database-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const authSecretConfigured = Boolean(process.env.AUTH_SECRET?.trim());
  try {
    await checkDatabaseConnection();
    return NextResponse.json({ ok: true, database: "connected", authSecretConfigured });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const message = error instanceof Error ? error.message : "";
    const database = /bad auth|authentication failed/i.test(message) || ["18", "8000"].includes(code)
      ? "authentication_failed"
      : "unavailable";
    return NextResponse.json({ ok: false, database, authSecretConfigured }, { status: 503 });
  }
}
