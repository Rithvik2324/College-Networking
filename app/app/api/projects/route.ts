import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/database-store";
import { projectView } from "@/lib/views";
import { z } from "zod";

const projectSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(2).max(60),
  skills: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
});

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().slice(0, 80);
  const category = searchParams.get("category")?.trim().slice(0, 60);
  const store = getStore();
  const records = (await store.list("projects", [["visibility", "==", "public"]]))
    .filter((project) => (!category || project.category === category) &&
      (!query || `${project.title}\n${project.description}`.toLowerCase().includes(query.toLowerCase())))
    .sort((first, second) => second.updatedAt.getTime() - first.updatedAt.getTime()).slice(0, 60);
  const projects = await Promise.all(records.map((project) => projectView(store, project)));
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = projectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Complete each required project field." }, { status: 400 });

  const store = getStore();
  const created = await store.atomic(async (transaction) => {
    const project = await transaction.create("projects", {
      ownerId: currentUser.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      requiredSkills: [...new Set(parsed.data.skills)],
    });
    await transaction.create("projectMembers", { projectId: project.id, userId: currentUser.id, role: "owner" });
    return project;
  });
  const project = await projectView(store, created);
  return NextResponse.json({ project }, { status: 201 });
}
