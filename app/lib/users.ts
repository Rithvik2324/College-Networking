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
    degree: user.degree || "",
    specialization: user.specialization || "",
    graduationYear: user.graduationYear ?? null,
    headline: user.headline || "",
    careerInterests: user.careerInterests || [],
    lookingFor: user.lookingFor || [],
    profileVisibility: user.profileVisibility || "public",
    emailVisibility: user.emailVisibility ?? false,
    phone: user.phone || null,
    phoneVisibility: user.phoneVisibility ?? false,
    profileCompletion: calculateProfileCompletion(user),
    availability: user.availability,
    bio: user.bio,
    onboardingComplete: user.onboardingComplete,
    onboardingStep: user.onboardingStep,
    notificationsEnabled: user.notificationsEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function calculateProfileCompletion(user: UserRecord) {
  const sections = [
    Boolean(user.name && user.email && user.college),
    Boolean(user.department && user.degree && user.yearOfStudy),
    Boolean(user.bio),
    Boolean(user.skills?.length),
    Boolean(user.interests?.length),
    Boolean(user.headline || user.careerInterests?.length),
  ];
  return Math.round((sections.filter(Boolean).length / sections.length) * 100);
}
