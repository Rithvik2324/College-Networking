import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
import { serializeUser } from "@/lib/users";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  college: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  yearOfStudy: z.number().int().min(1).max(8).optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
  intent: z.enum(["Hackathon-Ready", "Project-Building", "Startup Exploration", "Learning-Only"]).optional(),
  skill: z.string().trim().min(1).max(60).optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  availability: z.number().int().min(1).max(40).optional(),
  interests: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  bio: z.string().trim().max(400).optional(),
  onboardingStep: z.number().int().min(1).max(3).optional(),
  completeOnboarding: z.boolean().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user });
}

export async function PUT(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the profile fields and try again." }, { status: 400 });
  }
  if (parsed.data.completeOnboarding && (
    !parsed.data.college ||
    !parsed.data.department ||
    !parsed.data.yearOfStudy ||
    !parsed.data.intent ||
    !parsed.data.skill ||
    !parsed.data.availability ||
    !parsed.data.bio?.trim() ||
    !parsed.data.interests?.length
  )) {
    return NextResponse.json({ error: "Complete the required onboarding details before finishing." }, { status: 400 });
  }

  const { skills, interests, skill, completeOnboarding, ...profile } = parsed.data;
  const normalizedSkills = [...new Set([...(skills || []), ...(skill ? [skill] : [])])];

  const user = await getStore().atomic(async (store) => {
    const existing = await store.get("users", currentUser.id);
    if (!existing) throw new Error("Profile disappeared during update.");
    const updatedUser = await store.update("users", currentUser.id, {
      ...profile,
      ...(skill ? { primarySkill: skill } : {}),
      ...(completeOnboarding ? { onboardingComplete: true } : {}),
      skills: skills !== undefined ? normalizedSkills : [...new Set([...existing.skills, ...normalizedSkills])],
      ...(interests ? { interests: [...new Set(interests)] } : {}),
    });
    return serializeUser(updatedUser);
  });

  return NextResponse.json({ user });
}
