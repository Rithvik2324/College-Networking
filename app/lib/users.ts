import type { UserRecord } from "./database-store";

export function serializeUser(user: UserRecord) {
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
    skills: user.skills,
    interests: user.interests,
    availability: user.availability,
    bio: user.bio,
    onboardingComplete: user.onboardingComplete,
    onboardingStep: user.onboardingStep,
    notificationsEnabled: user.notificationsEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
