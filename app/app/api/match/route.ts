import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMatchingRecommendations } from "@/lib/matching";
import { prisma } from "@/lib/db";
import { userProfileInclude } from "@/lib/users";
import { z } from "zod";

const intentSchema = z.enum([
  "Hackathon-Ready",
  "Project-Building",
  "Startup Exploration",
  "Learning-Only",
]);
const skillSchema = z.enum(["Frontend", "Backend", "AI/ML", "UI/UX", "Blockchain", "Marketing"]);

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const current = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: userProfileInclude,
  });
  if (!current) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const peers = await prisma.user.findMany({
    where: { id: { not: current.id }, onboardingComplete: true },
    include: userProfileInclude,
  });

  const recommendations = getMatchingRecommendations(
    {
      id: current.id,
      name: current.name,
      intent: intentSchema.catch("Project-Building").parse(current.intent),
      skill: skillSchema.catch("Frontend").parse(current.primarySkill),
      availability: current.availability,
      interests: current.interests.map(({ interest }) => interest.name),
    },
    peers.map((user) => ({
      id: user.id,
      name: user.name,
      intent: intentSchema.catch("Project-Building").parse(user.intent),
      skill: skillSchema.catch("Frontend").parse(user.primarySkill),
      availability: user.availability,
      interests: user.interests.map(({ interest }) => interest.name),
    }))
  );

  return NextResponse.json({ recommendations });
}
