import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getStore } from "./firestore-store";
import { serializeUser } from "./users";

function getSecret() {
  const configuredSecret = process.env.AUTH_SECRET;
  if (!configuredSecret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be configured in production.");
  }

  return new TextEncoder().encode(
    configuredSecret || "intentlink-local-development-secret-not-for-production"
  );
}

export async function createSessionToken(userId: number) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.userId === "number" ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("intentlink_session")?.value;

  if (!token) {
    return null;
  }

  const userId = await verifySessionToken(token);
  if (!userId) {
    return null;
  }

  const user = await getStore().get("users", userId);

  return user ? serializeUser(user) : null;
}
