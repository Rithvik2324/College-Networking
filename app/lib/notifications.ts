import type { DatabaseStore, Records } from "./database-store";

export async function createNotification(
  database: DatabaseStore,
  data: Pick<Records["notifications"], "userId" | "type" | "message" | "href">
) {
  const recipient = await database.get("users", data.userId);
  if (!recipient?.notificationsEnabled) return null;
  return database.create("notifications", data);
}
