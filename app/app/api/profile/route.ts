import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeUser, userProfileInclude } from "@/lib/users";
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

  const user = await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: currentUser.id },
      data: {
        ...profile,
        ...(skill ? { primarySkill: skill } : {}),
        ...(completeOnboarding ? { onboardingComplete: true } : {}),
      },
    });

    if (skills !== undefined) {
      await transaction.userSkill.deleteMany({ where: { userId: currentUser.id } });
    }

    for (const name of normalizedSkills) {
      const savedSkill = await transaction.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      if (skills !== undefined) {
        await transaction.userSkill.create({ data: { userId: currentUser.id, skillId: savedSkill.id } });
      } else {
        await transaction.userSkill.upsert({
          where: { userId_skillId: { userId: currentUser.id, skillId: savedSkill.id } },
          update: {},
          create: { userId: currentUser.id, skillId: savedSkill.id },
        });
      }
    }

    if (interests) {
      await transaction.userInterest.deleteMany({ where: { userId: currentUser.id } });
      for (const name of new Set(interests)) {
        const savedInterest = await transaction.interest.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        await transaction.userInterest.create({
          data: { userId: currentUser.id, interestId: savedInterest.id },
        });
      }
    }

    const updatedUser = await transaction.user.findUnique({
      where: { id: currentUser.id },
      include: userProfileInclude,
    });
    if (!updatedUser) throw new Error("Profile disappeared during update.");
    return serializeUser(updatedUser);
  });

  return NextResponse.json({ user });
}
