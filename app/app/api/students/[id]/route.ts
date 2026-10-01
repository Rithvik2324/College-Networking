import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { userProfileInclude } from "@/lib/users";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const student = await prisma.user.findUnique({
    where: { id, onboardingComplete: true },
    include: {
      ...userProfileInclude,
      ownedProjects: { select: { id: true, title: true, category: true, status: true } },
      communityMemberships: {
        include: { community: { select: { id: true, name: true, intent: true, isPrivate: true } } },
      },
    },
  });
  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      college: student.college,
      department: student.department,
      yearOfStudy: student.yearOfStudy,
      avatarUrl: student.avatarUrl,
      intent: student.intent,
      skill: student.primarySkill,
      skills: student.skills.map(({ skill }) => skill.name),
      interests: student.interests.map(({ interest }) => interest.name),
      availability: student.availability,
      bio: student.bio,
      projects: student.ownedProjects,
      communities: student.communityMemberships
        .map(({ community }) => community)
        .filter((community) => !community.isPrivate)
        .map(({ id, name, intent }) => ({ id, name, intent })),
    },
  });
}
