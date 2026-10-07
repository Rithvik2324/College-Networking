import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/database-store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const store = getStore();
  const student = await store.get("users", id);
  if (!student?.onboardingComplete) return NextResponse.json({ error: "Student not found." }, { status: 404 });
  if (student.id !== currentUser.id) {
    if (student.profileVisibility === "private") return NextResponse.json({ error: "Student not found." }, { status: 404 });
    if (student.profileVisibility === "college" && student.college !== currentUser.college) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    if (student.profileVisibility === "connections") {
      const connections = await store.list("collaborationRequests", [["status", "==", "accepted"]]);
      const connected = connections.some((item) =>
        (item.senderId === currentUser.id && item.receiverId === student.id) ||
        (item.receiverId === currentUser.id && item.senderId === student.id));
      if (!connected) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }
  }
  const projects = await store.list("projects", [["ownerId", "==", id]]);
  const memberships = await store.list("communityMembers", [["userId", "==", id]]);
  const communities = await Promise.all(memberships.map((member) => store.get("communities", member.communityId)));

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
      skills: student.skills,
      interests: student.interests,
      availability: student.availability,
      bio: student.bio,
      headline: student.headline || "",
      degree: student.degree || "",
      specialization: student.specialization || "",
      graduationYear: student.graduationYear ?? null,
      careerInterests: student.careerInterests || [],
      lookingFor: student.lookingFor || [],
      ...(student.emailVisibility ? { email: student.email } : {}),
      projects: projects.map(({ id, title, category, status }) => ({ id, title, category, status })),
      communities: communities.flatMap((community) => community && !community.isPrivate
        ? [{ id: community.id, name: community.name, intent: community.intent }] : []),
    },
  });
}
