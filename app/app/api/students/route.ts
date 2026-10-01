import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { userProfileInclude } from "@/lib/users";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().slice(0, 80);
  const skill = searchParams.get("skill")?.trim().slice(0, 60);
  const interest = searchParams.get("interest")?.trim().slice(0, 60);
  const department = searchParams.get("department")?.trim().slice(0, 120);
  const intent = searchParams.get("intent")?.trim();
  const year = Number(searchParams.get("year"));
  const filters: Prisma.UserWhereInput[] = [];

  if (query) {
    filters.push({ OR: [{ name: { contains: query } }, { bio: { contains: query } }, { department: { contains: query } }] });
  }
  if (skill) filters.push({ skills: { some: { skill: { name: { contains: skill } } } } });
  if (interest) filters.push({ interests: { some: { interest: { name: { contains: interest } } } } });
  if (department) filters.push({ department: { contains: department } });
  if (intent) filters.push({ intent });
  if (Number.isInteger(year) && year > 0) filters.push({ yearOfStudy: year });

  const students = await prisma.user.findMany({
    where: { id: { not: currentUser.id }, onboardingComplete: true, AND: filters },
    include: userProfileInclude,
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: 60,
  });
  const requests = await prisma.collaborationRequest.findMany({
    where: { OR: [{ senderId: currentUser.id }, { receiverId: currentUser.id }] },
    select: { id: true, senderId: true, receiverId: true, status: true },
  });

  return NextResponse.json({
    students: students.map((student) => {
      const relation = requests.find(
        (item) =>
          (item.senderId === currentUser.id && item.receiverId === student.id) ||
          (item.receiverId === currentUser.id && item.senderId === student.id)
      );
      return {
        id: student.id,
        name: student.name,
        college: student.college,
        department: student.department,
        yearOfStudy: student.yearOfStudy,
        avatarUrl: student.avatarUrl,
        intent: student.intent,
        skill: student.primarySkill,
        skills: student.skills.map(({ skill: entry }) => entry.name),
        interests: student.interests.map(({ interest: entry }) => entry.name),
        availability: student.availability,
        bio: student.bio,
        requestId: relation?.id || null,
        requestStatus: relation?.status || null,
        requestDirection: relation?.senderId === currentUser.id ? "sent" : relation ? "received" : null,
      };
    }),
  });
}
