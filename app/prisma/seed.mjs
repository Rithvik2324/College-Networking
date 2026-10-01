import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const sourcePath = path.join(process.cwd(), "data", "store.json");

async function main() {
  const seed = JSON.parse(await readFile(sourcePath, "utf8"));
  const userIds = new Set();
  const communityOwners = new Map();
  const communityMembers = new Map();

  for (const entry of seed.users) {
    const user = await prisma.user.upsert({
      where: { email: entry.email.toLowerCase() },
      update: {},
      create: {
        id: entry.id,
        name: entry.name,
        email: entry.email.toLowerCase(),
        passwordHash: entry.passwordHash,
        role: entry.role || "student",
        college: entry.college || "IntentLink Demo University",
        department: entry.department || "Computer Science",
        yearOfStudy: entry.yearOfStudy || 2,
        intent: entry.intent || "Project-Building",
        primarySkill: entry.skill || "Frontend",
        availability: entry.availability || 8,
        bio: entry.bio || "",
        onboardingComplete: true,
        onboardingStep: 3,
        createdAt: new Date(entry.createdAt || Date.now()),
      },
    });
    userIds.add(user.id);

    const skillName = entry.skill || "Frontend";
    const skill = await prisma.skill.upsert({
      where: { name: skillName },
      update: {},
      create: { name: skillName },
    });
    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId: user.id, skillId: skill.id } },
      update: {},
      create: { userId: user.id, skillId: skill.id, level: "intermediate" },
    });

    for (const name of entry.interests || []) {
      const interest = await prisma.interest.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      await prisma.userInterest.upsert({
        where: { userId_interestId: { userId: user.id, interestId: interest.id } },
        update: {},
        create: { userId: user.id, interestId: interest.id },
      });
    }
  }

  for (const entry of seed.communities) {
    if (!userIds.has(entry.ownerId)) continue;
    const community = await prisma.community.upsert({
      where: { id: entry.id },
      update: {},
      create: {
        id: entry.id,
        name: entry.name,
        goal: entry.goal,
        description: entry.description || entry.goal,
        intent: entry.intent || "Project-Building",
        timeline: entry.timeline || "1 Week",
        ownerId: entry.ownerId,
        maxMembers: 6,
        stage: entry.stage || "Create",
        isPrivate: Boolean(entry.isPrivate),
        createdAt: new Date(entry.createdAt || Date.now()),
      },
    });
    communityOwners.set(community.id, community.ownerId);

    const memberIds = new Set([community.ownerId, ...(entry.memberIds || [])]);
    communityMembers.set(community.id, memberIds);
    for (const userId of memberIds) {
      if (!userIds.has(userId)) continue;
      await prisma.communityMember.upsert({
        where: { communityId_userId: { communityId: community.id, userId } },
        update: {},
        create: {
          communityId: community.id,
          userId,
          role: userId === community.ownerId ? "owner" : "member",
        },
      });
    }
  }

  const projects = [
    {
      id: 1001,
      ownerId: 1,
      title: "Campus Navigator",
      description: "Help students find accessible places, useful services, and campus events in one trusted guide.",
      category: "Campus life",
      status: "Building",
      skills: ["Frontend", "Backend", "UI/UX"],
    },
    {
      id: 1002,
      ownerId: 3,
      title: "LabLink Research Finder",
      description: "Make it easier for students to discover research groups and contribute to active lab projects.",
      category: "Education",
      status: "Looking for teammates",
      skills: ["AI/ML", "Frontend", "Marketing"],
    },
  ];

  for (const entry of projects) {
    if (!userIds.has(entry.ownerId)) continue;
    const project = await prisma.project.upsert({
      where: { id: entry.id },
      update: {},
      create: {
        id: entry.id,
        ownerId: entry.ownerId,
        title: entry.title,
        description: entry.description,
        category: entry.category,
        status: entry.status,
      },
    });
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: project.ownerId } },
      update: {},
      create: { projectId: project.id, userId: project.ownerId, role: "owner" },
    });

    for (const name of entry.skills) {
      const skill = await prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      await prisma.projectSkill.upsert({
        where: { projectId_skillId: { projectId: project.id, skillId: skill.id } },
        update: {},
        create: { projectId: project.id, skillId: skill.id },
      });
    }
  }

  for (const entry of seed.tasks) {
    const ownerId = communityOwners.get(entry.communityId);
    if (!ownerId || !userIds.has(entry.assigneeId)) continue;
    await prisma.task.upsert({
      where: { id: entry.id },
      update: {},
      create: {
        id: entry.id,
        title: entry.title,
        description: entry.description || "",
        status: entry.status || (entry.done ? "Completed" : "To Do"),
        priority: entry.priority || "Medium",
        dueAt: entry.dueDate ? new Date(entry.dueDate) : null,
        communityId: entry.communityId,
        createdById: ownerId,
        assigneeId: entry.assigneeId,
        createdAt: new Date(entry.createdAt || Date.now()),
      },
    });
  }

  for (const entry of seed.messages) {
    const memberIds = communityMembers.get(entry.communityId);
    if (!memberIds?.has(entry.senderId)) continue;
    const conversationId = 10000 + entry.communityId;
    const conversation = await prisma.conversation.upsert({
      where: { id: conversationId },
      update: {},
      create: {
        id: conversationId,
        kind: "community",
        communityId: entry.communityId,
      },
    });
    for (const userId of memberIds) {
      await prisma.conversationMember.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId } },
        update: {},
        create: { conversationId: conversation.id, userId },
      });
    }
    await prisma.message.upsert({
      where: { id: entry.id },
      update: {},
      create: {
        id: entry.id,
        conversationId: conversation.id,
        senderId: entry.senderId,
        body: entry.text,
        createdAt: new Date(entry.createdAt || Date.now()),
      },
    });
  }

  for (const entry of seed.notifications) {
    if (!userIds.has(entry.userId)) continue;
    await prisma.notification.upsert({
      where: { id: entry.id },
      update: {},
      create: {
        id: entry.id,
        userId: entry.userId,
        type: entry.type,
        message: entry.message,
        isRead: Boolean(entry.read),
        createdAt: new Date(entry.createdAt || Date.now()),
      },
    });
  }

  console.log(`Seeded ${userIds.size} existing users and sample project/community data.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
