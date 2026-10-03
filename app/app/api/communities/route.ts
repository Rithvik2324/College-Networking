import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
import { communityView } from "@/lib/views";
import { z } from "zod";

const communitySchema = z.object({
  name: z.string().trim().min(3).max(80),
  goal: z.string().trim().min(5).max(240),
  description: z.string().trim().max(1000).optional(),
  intent: z.enum(["Hackathon-Ready", "Project-Building", "Startup Exploration", "Learning-Only"]),
  timeline: z.string().trim().min(1).max(40).optional(),
  isPrivate: z.boolean().optional(),
});

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = getStore();
  const memberships = await store.list("communityMembers", [["userId", "==", currentUser.id]]);
  const visible = new Map((await store.list("communities", [["isPrivate", "==", false]])).map((community) => [community.id, community]));
  for (const member of memberships) {
    const community = await store.get("communities", member.communityId);
    if (community) visible.set(community.id, community);
  }
  const communities = await Promise.all([...visible.values()]
    .sort((first, second) => second.updatedAt.getTime() - first.updatedAt.getTime())
    .map((community) => communityView(store, community)));

  return NextResponse.json({
    communities: communities.map((community) => ({
      ...community,
      memberIds: community.members.map(({ userId }) => userId),
      memberCount: community.members.length,
    })),
    user: currentUser,
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = communitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a community name, a clear goal, and a valid intent." }, { status: 400 });
  }

  const store = getStore();
  const created = await store.atomic(async (transaction) => {
    const community = await transaction.create("communities", {
      name: parsed.data.name,
      goal: parsed.data.goal,
      description: parsed.data.description || "",
      intent: parsed.data.intent,
      timeline: parsed.data.timeline || "1 Week",
      isPrivate: parsed.data.isPrivate || false,
      maxMembers: 6,
      ownerId: currentUser.id,
    });
    await transaction.create("communityMembers", { communityId: community.id, userId: currentUser.id, role: "owner" });
    return community;
  });
  const community = await communityView(store, created);

  return NextResponse.json({ community }, { status: 201 });
}
