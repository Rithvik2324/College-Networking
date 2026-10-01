import type { Prisma } from "@prisma/client";

export const userProfileInclude = {
  skills: { include: { skill: true } },
  interests: { include: { interest: true } },
} satisfies Prisma.UserInclude;

export type UserWithProfile = Prisma.UserGetPayload<{
  include: typeof userProfileInclude;
}>;

export function serializeUser(user: UserWithProfile) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    college: user.college,
    department: user.department,
    yearOfStudy: user.yearOfStudy,
    avatarUrl: user.avatarUrl,
    intent: user.intent,
    skill: user.primarySkill,
    skills: user.skills.map(({ skill }) => skill.name),
    interests: user.interests.map(({ interest }) => interest.name),
    availability: user.availability,
    bio: user.bio,
    onboardingComplete: user.onboardingComplete,
    onboardingStep: user.onboardingStep,
    notificationsEnabled: user.notificationsEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
