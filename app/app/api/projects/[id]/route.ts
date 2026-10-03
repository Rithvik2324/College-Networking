import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
import { projectView } from "@/lib/views";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  category: z.string().trim().min(2).max(60).optional(),
  status: z.enum(["Idea", "Looking for teammates", "Building", "Launched", "Paused"]).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const store = getStore();
  const record = await store.get("projects", id);
  if (!record || (record.visibility !== "public" && !(await store.get("projectMembers", `${id}_${currentUser.id}`)))) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const project = { ...await projectView(store, record, true),
    joinRequests: (await store.list("projectJoinRequests", [["projectId", "==", id], ["applicantId", "==", currentUser.id]]))
      .map(({ id, status }) => ({ id, status })),
  };
  return NextResponse.json({ project });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await context.params).id);
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(id) || id < 1 || !parsed.success) {
    return NextResponse.json({ error: "Check the project updates and try again." }, { status: 400 });
  }

  const project = await getStore().get("projects", id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (project.ownerId !== currentUser.id) return NextResponse.json({ error: "Only the project owner can edit it." }, { status: 403 });

  const updated = await getStore().update("projects", id, parsed.data);
  return NextResponse.json({ project: updated });
}
