import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMatchingRecommendations } from "@/lib/matching";
import { getStore } from "@/lib/firestore-store";
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

  const store = getStore();
  const current = await store.get("users", currentUser.id);
  if (!current) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const peers = (await store.list("users", [["onboardingComplete", "==", true]]))
    .filter((peer) => peer.id !== current.id);

  const recommendations = getMatchingRecommendations(
    {
      id: current.id,
      name: current.name,
      intent: intentSchema.catch("Project-Building").parse(current.intent),
      skill: skillSchema.catch("Frontend").parse(current.primarySkill),
      availability: current.availability,
      interests: current.interests,
    },
    peers.map((user) => ({
      id: user.id,
      name: user.name,
      intent: intentSchema.catch("Project-Building").parse(user.intent),
      skill: skillSchema.catch("Frontend").parse(user.primarySkill),
      availability: user.availability,
      interests: user.interests,
    }))
  );

  return NextResponse.json({ recommendations });
}
