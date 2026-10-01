import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  const communities = await prisma.community.findMany({
    where: {
      OR: [
        { isPrivate: false },
        { members: { some: { userId: currentUser.id } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, primarySkill: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

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

  const community = await prisma.community.create({
    data: {
      name: parsed.data.name,
      goal: parsed.data.goal,
      description: parsed.data.description || "",
      intent: parsed.data.intent,
      timeline: parsed.data.timeline || "1 Week",
      isPrivate: parsed.data.isPrivate || false,
      maxMembers: 6,
      ownerId: currentUser.id,
      members: { create: { userId: currentUser.id, role: "owner" } },
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: { select: { userId: true } },
    },
  });

  return NextResponse.json({ community }, { status: 201 });
}
