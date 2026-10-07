import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/database-store";

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
  const store = getStore();
  const contains = (value: string | null, term: string) => (value || "").toLowerCase().includes(term.toLowerCase());
  const [allStudents, requests] = await Promise.all([
    store.list("users", [["onboardingComplete", "==", true]]),
    store.list("collaborationRequests", [["status", "==", "accepted"]]),
  ]);
  const students = allStudents
    .filter((student) => student.id !== currentUser.id &&
      student.profileVisibility !== "private" &&
      (student.profileVisibility !== "college" || student.college === currentUser.college) &&
      (student.profileVisibility !== "connections" || requests.some((item) =>
        (item.senderId === currentUser.id && item.receiverId === student.id) ||
        (item.receiverId === currentUser.id && item.senderId === student.id))) &&
      (!query || [student.name, student.bio, student.department].some((value) => contains(value, query))) &&
      (!skill || student.skills.some((value) => contains(value, skill))) &&
      (!interest || student.interests.some((value) => contains(value, interest))) &&
      (!department || contains(student.department, department)) &&
      (!intent || student.intent === intent) &&
      (!(Number.isInteger(year) && year > 0) || student.yearOfStudy === year))
    .sort((first, second) => second.updatedAt.getTime() - first.updatedAt.getTime() || first.name.localeCompare(second.name))
    .slice(0, 60);
  const userRequests = [
    ...await store.list("collaborationRequests", [["senderId", "==", currentUser.id]]),
    ...await store.list("collaborationRequests", [["receiverId", "==", currentUser.id]]),
  ];

  return NextResponse.json({
    students: students.map((student) => {
      const relation = userRequests.find(
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
        skills: student.skills,
        interests: student.interests,
        availability: student.availability,
        bio: student.bio,
        headline: student.headline || "",
        degree: student.degree || "",
        ...(student.emailVisibility ? { email: student.email } : {}),
        requestId: relation?.id || null,
        requestStatus: relation?.status || null,
        requestDirection: relation?.senderId === currentUser.id ? "sent" : relation ? "received" : null,
      };
    }),
  });
}
