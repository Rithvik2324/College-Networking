import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
  const projects = await prisma.project.findMany({
    where: {
      visibility: "public",
      ...(category ? { category } : {}),
      ...(query ? { OR: [{ title: { contains: query } }, { description: { contains: query } }] } : {}),
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      requiredSkills: { include: { skill: true } },
      _count: { select: { joinRequests: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = projectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Complete each required project field." }, { status: 400 });

  const project = await prisma.project.create({
    data: {
      ownerId: currentUser.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      members: { create: { userId: currentUser.id, role: "owner" } },
      requiredSkills: {
        create: [...new Set(parsed.data.skills)].map((name) => ({
          skill: { connectOrCreate: { where: { name }, create: { name } } },
        })),
      },
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      requiredSkills: { include: { skill: true } },
    },
  });
  return NextResponse.json({ project }, { status: 201 });
}
