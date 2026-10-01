import type { Prisma, PrismaClient } from "@prisma/client";

type NotificationDatabase = PrismaClient | Prisma.TransactionClient;

export async function createNotification(
  database: NotificationDatabase,
  data: Prisma.NotificationUncheckedCreateInput
) {
  const recipient = await database.user.findUnique({
    where: { id: data.userId },
    select: { notificationsEnabled: true },
  });
  if (!recipient?.notificationsEnabled) return null;
  return database.notification.create({ data });
}
