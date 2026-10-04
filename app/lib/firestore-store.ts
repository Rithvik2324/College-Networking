import "server-only";
import { Timestamp, type Firestore, type Transaction, type DocumentReference, type DocumentData } from "firebase-admin/firestore";
import { getFirestoreDatabase } from "./firebase-admin";

type DatedRecord = { id: number; createdAt: Date };
type UpdatedRecord = DatedRecord & { updatedAt: Date };
export type UserRecord = UpdatedRecord & {
  name: string; email: string; passwordHash: string; role: string; college: string | null;
  department: string | null; yearOfStudy: number | null; avatarUrl: string | null;
  intent: string; primarySkill: string; availability: number; bio: string;
  onboardingComplete: boolean; onboardingStep: number; notificationsEnabled: boolean;
  skills: string[]; interests: string[];
  skillLevels?: Record<string, string>;
};
export type ProjectRecord = UpdatedRecord & {
  ownerId: number; title: string; description: string; category: string; status: string;
  visibility: string; requiredSkills: string[];
};
export interface Records {
  users: UserRecord;
  communities: UpdatedRecord & { name: string; goal: string; description: string; intent: string; timeline: string; ownerId: number; maxMembers: number; stage: string; isPrivate: boolean };
  communityMembers: { communityId: number; userId: number; role: string; joinedAt: Date };
  communityInvitations: UpdatedRecord & { communityId: number; inviterId: number; inviteeId: number; status: string };
  collaborationRequests: UpdatedRecord & { senderId: number; receiverId: number; status: string; message: string };
  projects: ProjectRecord;
  projectMembers: { projectId: number; userId: number; role: string; joinedAt: Date };
  projectJoinRequests: UpdatedRecord & { projectId: number; applicantId: number; reviewerId: number | null; message: string; status: string };
  tasks: UpdatedRecord & { title: string; description: string; status: string; priority: string; dueAt: Date | null; communityId: number | null; projectId: number | null; createdById: number; assigneeId: number | null };
  taskActivities: DatedRecord & { taskId: number; actorId: number; action: string; details: string };
  conversations: DatedRecord & { kind: string; communityId: number | null };
  conversationMembers: { conversationId: number; userId: number; joinedAt: Date; lastReadAt: Date | null };
  messages: DatedRecord & { conversationId: number; senderId: number; body: string };
  notifications: DatedRecord & { userId: number; type: string; message: string; href: string | null; isRead: boolean };
}
export type Collection = keyof Records;
export type Condition = [string, "==" | "in" | "array-contains", unknown];

const compositeKeys: Partial<Record<Collection, string[]>> = {
  communityMembers: ["communityId", "userId"],
  projectMembers: ["projectId", "userId"],
  conversationMembers: ["conversationId", "userId"],
};

function decode(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
  }
  return value;
}

function matches(data: DocumentData, conditions: Condition[]) {
  return conditions.every(([field, operator, value]) => {
    if (operator === "in") return Array.isArray(value) && value.includes(data[field]);
    if (operator === "array-contains") return Array.isArray(data[field]) && data[field].includes(value);
    return data[field] === value;
  });
}

function defaults(collection: Collection) {
  const now = new Date();
  switch (collection) {
    case "users": return { role: "student", college: null, department: null, yearOfStudy: null, avatarUrl: null, intent: "Project-Building", primarySkill: "Frontend", availability: 8, bio: "", onboardingComplete: false, onboardingStep: 1, notificationsEnabled: true, skills: [], interests: [], createdAt: now, updatedAt: now };
    case "communities": return { description: "", timeline: "1 Week", maxMembers: 6, stage: "Create", isPrivate: false, createdAt: now, updatedAt: now };
    case "projects": return { status: "Idea", visibility: "public", requiredSkills: [], createdAt: now, updatedAt: now };
    case "communityMembers": case "projectMembers": return { role: "member", joinedAt: now };
    case "conversationMembers": return { joinedAt: now, lastReadAt: null };
    case "communityInvitations": return { status: "pending", createdAt: now, updatedAt: now };
    case "collaborationRequests": return { status: "pending", message: "", createdAt: now, updatedAt: now };
    case "projectJoinRequests": return { status: "pending", message: "", reviewerId: null, createdAt: now, updatedAt: now };
    case "tasks": return { description: "", status: "To Do", priority: "Medium", dueAt: null, communityId: null, projectId: null, assigneeId: null, createdAt: now, updatedAt: now };
    case "taskActivities": return { details: "", createdAt: now };
    case "conversations": return { kind: "direct", communityId: null, createdAt: now };
    case "messages": return { createdAt: now };
    case "notifications": return { href: null, isRead: false, createdAt: now };
  }
}

export class FirestoreStore {
  private pending = new Map<string, { ref: DocumentReference; data: DocumentData | null }>();
  private ready?: Promise<void>;

  constructor(private database: Firestore, private transaction?: Transaction, private prefix = "", private requireReady = false) {}

  private assertReady() {
    if (!this.requireReady) return Promise.resolve();
    this.ready ??= (async () => {
      const ref = this.reference("_meta", "storage");
      const snapshot = this.transaction ? await this.transaction.get(ref) : await ref.get();
      if (snapshot.data()?.status !== "ready" || snapshot.data()?.version !== 1) {
        throw new Error("Firestore is not ready. Complete the database migration before starting the app.");
      }
    })();
    return this.ready;
  }

  private reference(collection: string, key: string | number) {
    return this.database.collection(`${this.prefix}${collection}`).doc(String(key));
  }

  async get<Kind extends Collection>(collection: Kind, key: string | number): Promise<Records[Kind] | null> {
    await this.assertReady();
    const ref = this.reference(collection, key);
    const staged = this.pending.get(ref.path);
    if (staged) return staged.data as Records[Kind] | null;
    const snapshot = this.transaction ? await this.transaction.get(ref) : await ref.get();
    return snapshot.exists ? decode(snapshot.data()) as Records[Kind] : null;
  }

  async list<Kind extends Collection>(collection: Kind, conditions: Condition[] = []): Promise<Records[Kind][]> {
    await this.assertReady();
    let query = this.database.collection(`${this.prefix}${collection}`) as FirebaseFirestore.Query;
    const first = conditions[0];
    if (first) query = query.where(first[0], first[1], first[2]);
    const snapshot = this.transaction ? await this.transaction.get(query) : await query.get();
    const rows = new Map(snapshot.docs.map((document) => [document.ref.path, decode(document.data()) as DocumentData]));
    for (const [path, entry] of this.pending) {
      if (entry.ref.parent.path !== `${this.prefix}${collection}`) continue;
      if (entry.data) rows.set(path, entry.data);
      else rows.delete(path);
    }
    return [...rows.values()].filter((row) => matches(row, conditions)) as Records[Kind][];
  }

  async create<Kind extends Collection>(collection: Kind, data: Partial<Records[Kind]>): Promise<Records[Kind]> {
    if (!this.transaction) return this.atomic((store) => store.create(collection, data));
    await this.assertReady();
    const defined = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    const row: DocumentData = { ...defaults(collection), ...defined };
    const keys = compositeKeys[collection];
    let key: string | number;
    if (keys) {
      key = keys.map((field) => row[field]).join("_");
      if (await this.get(collection, key)) throw new Error("Membership already exists.");
    } else {
      const counter = this.reference("_counters", collection);
      const staged = this.pending.get(counter.path);
      const snapshot = staged ? null : await this.transaction.get(counter);
      const value = Number(staged?.data?.value ?? snapshot?.data()?.value ?? 0) + 1;
      this.pending.set(counter.path, { ref: counter, data: { value } });
      row.id = value;
      key = value;
    }
    this.pending.set(this.reference(collection, key).path, { ref: this.reference(collection, key), data: row });
    return row as Records[Kind];
  }

  async update<Kind extends Collection>(collection: Kind, key: string | number, data: Partial<Records[Kind]>): Promise<Records[Kind]> {
    if (!this.transaction) return this.atomic((store) => store.update(collection, key, data));
    const existing = await this.get(collection, key);
    if (!existing) throw new Error(`${collection} record not found.`);
    const defined = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    const row = { ...existing, ...defined, ...("updatedAt" in existing ? { updatedAt: new Date() } : {}) };
    const ref = this.reference(collection, key);
    this.pending.set(ref.path, { ref, data: row });
    return row;
  }

  async remove(collection: Collection, key: string | number): Promise<void> {
    if (!this.transaction) return this.atomic((store) => store.remove(collection, key));
    await this.assertReady();
    const ref = this.reference(collection, key);
    this.pending.set(ref.path, { ref, data: null });
  }

  async atomic<Result>(operation: (store: FirestoreStore) => Promise<Result>): Promise<Result> {
    if (this.transaction) return operation(this);
    return this.database.runTransaction(async (transaction) => {
      const store = new FirestoreStore(this.database, transaction, this.prefix, this.requireReady);
      await store.assertReady();
      const result = await operation(store);
      for (const entry of store.pending.values()) {
        if (entry.data) transaction.set(entry.ref, entry.data);
        else transaction.delete(entry.ref);
      }
      return result;
    });
  }
}

export function getStore() {
  return new FirestoreStore(getFirestoreDatabase(), undefined, "", true);
}