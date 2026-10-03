import type { FirestoreStore } from "./firestore-store";

export async function ensureDirectConversation(store: FirestoreStore, firstId: number, secondId: number) {
  const memberships = await store.list("conversationMembers", [["userId", "==", firstId]]);
  for (const membership of memberships) {
    const conversation = await store.get("conversations", membership.conversationId);
    if (!conversation || conversation.kind !== "direct" || conversation.communityId !== null) continue;
    const members = await store.list("conversationMembers", [["conversationId", "==", conversation.id]]);
    if (members.length === 2 && members.some((member) => member.userId === secondId)) return conversation;
  }
  const conversation = await store.create("conversations", { kind: "direct", communityId: null });
  await store.create("conversationMembers", { conversationId: conversation.id, userId: firstId });
  await store.create("conversationMembers", { conversationId: conversation.id, userId: secondId });
  return conversation;
}

export async function ensureCommunityConversation(store: FirestoreStore, communityId: number) {
  const [existing] = await store.list("conversations", [["communityId", "==", communityId], ["kind", "==", "community"]]);
  const conversation = existing ?? await store.create("conversations", { kind: "community", communityId });
  const members = await store.list("communityMembers", [["communityId", "==", communityId]]);
  for (const member of members) {
    if (!(await store.get("conversationMembers", `${conversation.id}_${member.userId}`))) {
      await store.create("conversationMembers", { conversationId: conversation.id, userId: member.userId });
    }
  }
  return conversation;
}

export async function conversationAccess(store: FirestoreStore, conversationId: number, userId: number) {
  const membership = await store.get("conversationMembers", `${conversationId}_${userId}`);
  if (!membership) return null;
  const conversation = await store.get("conversations", conversationId);
  if (!conversation) return null;
  if (conversation.communityId && !(await store.get("communityMembers", `${conversation.communityId}_${userId}`))) return null;
  return { conversation, membership };
}