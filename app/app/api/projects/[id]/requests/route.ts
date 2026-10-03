import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/firestore-store";
import { userSummary } from "@/lib/views";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const responseSchema = z.object({
  requestId: z.number().int().positive(),
  status: z.enum(["accepted", "rejected"]),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = Number((await context.params).id);
  if (!Number.isInteger(projectId) || projectId < 1) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const store = getStore();
  const project = await store.get("projects", projectId);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (project.ownerId !== currentUser.id) return NextResponse.json({ error: "Only the owner can review requests." }, { status: 403 });

  const records = (await store.list("projectJoinRequests", [["projectId", "==", projectId]]))
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
  const requests = await Promise.all(records.map(async (item) => ({ ...item, applicant: await userSummary(store, item.applicantId) })));
  return NextResponse.json({ requests });
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = Number((await context.params).id);
  if (!Number.isInteger(projectId) || projectId < 1) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const store = getStore();
  const project = await store.get("projects", projectId);
  if (!project || project.visibility !== "public") return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (project.ownerId === currentUser.id) return NextResponse.json({ error: "You already own this project." }, { status: 409 });
  const member = await store.get("projectMembers", `${projectId}_${currentUser.id}`);
  if (member) return NextResponse.json({ error: "You are already a project member." }, { status: 409 });

  const existing = await store.list("projectJoinRequests", [["projectId", "==", projectId], ["applicantId", "==", currentUser.id], ["status", "==", "pending"]]);
  if (existing.length) return NextResponse.json({ error: "Your request is already pending." }, { status: 409 });

  const joinRequest = await store.atomic(async (transaction) => {
    const duplicate = await transaction.list("projectJoinRequests", [["projectId", "==", projectId], ["applicantId", "==", currentUser.id], ["status", "==", "pending"]]);
    if (duplicate.length) return duplicate[0];
    const created = await transaction.create("projectJoinRequests", { projectId, applicantId: currentUser.id });
    await createNotification(transaction, {
        userId: project.ownerId,
        type: "project-join-request",
        message: `${currentUser.name} requested to join ${project.title}.`,
        href: `/projects/${projectId}`,
    });
    return created;
  });
  return NextResponse.json({ request: joinRequest }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = Number((await context.params).id);
  const parsed = responseSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(projectId) || projectId < 1 || !parsed.success) {
    return NextResponse.json({ error: "Invalid join request update." }, { status: 400 });
  }

  const [project, joinRequest] = await Promise.all([
    getStore().get("projects", projectId),
    getStore().get("projectJoinRequests", parsed.data.requestId),
  ]);
  if (!project || !joinRequest || joinRequest.projectId !== projectId) {
    return NextResponse.json({ error: "Join request not found." }, { status: 404 });
  }
  if (project.ownerId !== currentUser.id) return NextResponse.json({ error: "Only the owner can review requests." }, { status: 403 });
  if (joinRequest.status !== "pending") return NextResponse.json({ error: "This request has already been answered." }, { status: 409 });

  const result = await getStore().atomic(async (transaction) => {
    const latest = await transaction.get("projectJoinRequests", joinRequest.id);
    if (!latest || latest.status !== "pending") return { error: "This request has already been answered." };
    const updated = await transaction.update("projectJoinRequests", joinRequest.id, { status: parsed.data.status, reviewerId: currentUser.id });
    if (parsed.data.status === "accepted") {
      if (!(await transaction.get("projectMembers", `${projectId}_${joinRequest.applicantId}`))) {
        await transaction.create("projectMembers", { projectId, userId: joinRequest.applicantId });
      }
    }
    await createNotification(transaction, {
        userId: joinRequest.applicantId,
        type: `project-request-${parsed.data.status}`,
        message: `Your request to join ${project.title} was ${parsed.data.status}.`,
        href: `/projects/${projectId}`,
    });
    return { request: updated };
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ request: result.request });
}
