import "server-only";
import { MongoClient, type ClientSession, type Collection as MongoCollection, type Document, type Filter } from "mongodb";

type DatedRecord = { id: number; createdAt: Date };
type UpdatedRecord = DatedRecord & { updatedAt: Date };
export type UserRecord = UpdatedRecord & {
  name: string; email: string; passwordHash: string; role: string; college: string | null;
  department: string | null; yearOfStudy: number | null; avatarUrl: string | null;
  intent: string; primarySkill: string; availability: number; bio: string;
  onboardingComplete: boolean; onboardingStep: number; notificationsEnabled: boolean;
  skills: string[]; interests: string[]; skillLevels?: Record<string, string>;
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
type StoredDocument = Document & { _id: any };

const compositeFields: Partial<Record<Collection, string[]>> = {
  communityMembers: ["communityId", "userId"], projectMembers: ["projectId", "userId"],
  conversationMembers: ["conversationId", "userId"],
};

const defaults = (collection: Collection) => {
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
};

function whereFor(conditions: Condition[]): Document {
  return conditions.length ? { $and: conditions.map(([field, operator, value]) => ({
    [field]: operator === "in" ? { $in: value } : value,
  })) } : {};
}

function storageId(collection: Collection, key: string | number): number | string {
  const fields = compositeFields[collection];
  if (!fields) {
    const id = Number(key);
    if (!Number.isSafeInteger(id)) throw new Error(`Invalid ${collection} id.`);
    return id;
  }
  const values = String(key).split("_").map(Number);
  if (values.length !== fields.length || values.some((value) => !Number.isSafeInteger(value))) throw new Error(`Invalid ${collection} key.`);
  return values.join("_");
}

const collectionNames: Record<Collection, string> = {
  users: "users", communities: "communities", communityMembers: "communityMembers",
  communityInvitations: "communityInvitations", collaborationRequests: "collaborationRequests",
  projects: "projects", projectMembers: "projectMembers", projectJoinRequests: "projectJoinRequests",
  tasks: "tasks", taskActivities: "taskActivities", conversations: "conversations",
  conversationMembers: "conversationMembers", messages: "messages", notifications: "notifications",
};

function normalize<Kind extends Collection>(doc: (Document & { _id: number | string }) | null): Records[Kind] | null {
  if (!doc) return null;
  const { _id, ...record } = doc;
  return { ...record, id: typeof _id === "number" ? _id : undefined } as Records[Kind];
}

export class DatabaseStore {
  private constructor(private readonly databasePromise: Promise<import("mongodb").Db> | import("mongodb").Db, private readonly session?: ClientSession) {}

  static create(database: Promise<import("mongodb").Db> | import("mongodb").Db) { return new DatabaseStore(database); }

  private async database() { return await this.databasePromise; }

  private async collection(collection: Collection): Promise<MongoCollection<StoredDocument>> {
    return (await this.database()).collection(collectionNames[collection]) as unknown as MongoCollection<StoredDocument>;
  }

  private options() { return this.session ? { session: this.session } : {}; }

  async get<Kind extends Collection>(collection: Kind, key: string | number): Promise<Records[Kind] | null> {
    const filter = { _id: storageId(collection, key) } as unknown as Filter<StoredDocument>;
    const doc = await (await this.collection(collection)).findOne(filter, this.options());
    return normalize<Kind>(doc as (Document & { _id: number | string }) | null);
  }

  async list<Kind extends Collection>(collection: Kind, conditions: Condition[] = []): Promise<Records[Kind][]> {
    const docs = await (await this.collection(collection)).find(whereFor(conditions), this.options()).toArray();
    return docs.map((doc) => normalize<Kind>(doc as Document & { _id: number | string })!);
  }

  async create<Kind extends Collection>(collection: Kind, input: Partial<Records[Kind]>): Promise<Records[Kind]> {
    const data = { ...defaults(collection), ...Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) } as Record<string, unknown>;
    const fields = compositeFields[collection];
    let id: number | string;
    if (fields) {
      id = fields.map((field) => data[field]).join("_");
    } else if (Number.isSafeInteger(data.id)) {
      id = data.id as number;
    } else {
      const counter = await (await this.database()).collection<{ _id: string; value: number }>("_counters").findOneAndUpdate(
        { _id: collection }, { $inc: { value: 1 } }, { upsert: true, returnDocument: "after", ...this.options() },
      );
      const metadataValue = (counter as unknown as { value?: unknown } | null)?.value;
      const counterDoc = metadataValue && typeof metadataValue === "object"
        ? metadataValue as { value?: number }
        : counter as unknown as { value?: number } | null;
      if (!counterDoc || !Number.isSafeInteger(counterDoc.value)) throw new Error("Could not allocate a database id.");
      id = counterDoc.value as number;
    }
    delete data.id;
    const doc = { ...data, _id: id } as StoredDocument;
    await (await this.collection(collection)).insertOne(doc, this.options());
    return normalize<Kind>(doc as Document & { _id: number | string })!;
  }

  async update<Kind extends Collection>(collection: Kind, key: string | number, input: Partial<Records[Kind]>): Promise<Records[Kind]> {
    const data = Object.fromEntries(Object.entries(input).filter(([field, value]) => field !== "id" && value !== undefined)) as Record<string, unknown>;
    if ("updatedAt" in defaults(collection)) data.updatedAt = new Date();
    const filter = { _id: storageId(collection, key) } as unknown as Filter<StoredDocument>;
    const result = await (await this.collection(collection)).findOneAndUpdate(
      filter, { $set: data }, { returnDocument: "after", ...this.options() },
    );
    const doc = (result as unknown as { value?: Document | null } | null)?.value ?? result as unknown as Document | null;
    if (!doc) throw new Error(`${collection} record was not found.`);
    return normalize<Kind>(doc as Document & { _id: number | string })!;
  }

  async remove(collection: Collection, key: string | number): Promise<void> {
    const filter = { _id: storageId(collection, key) } as unknown as Filter<StoredDocument>;
    await (await this.collection(collection)).deleteOne(filter, this.options());
  }

  async atomic<Result>(operation: (store: DatabaseStore) => Promise<Result>): Promise<Result> {
    if (this.session) return operation(this);
    const database = await this.database();
    const session = database.client.startSession();
    try {
      let result!: Result;
      await session.withTransaction(async () => {
        result = await operation(new DatabaseStore(database, session));
      });
      return result;
    } finally {
      await session.endSession();
    }
  }
}

const globalMongo = globalThis as typeof globalThis & { intentLinkMongoClient?: MongoClient; intentLinkMongoDatabase?: Promise<import("mongodb").Db> };

async function getDatabase() {
  if (!globalMongo.intentLinkMongoDatabase) {
    const rawUri = process.env.MONGODB_URI;

    if (!rawUri) {
      throw new Error("MONGODB_URI is not configured.");
    }

    // Clean accidental quotes/whitespace from the Vercel environment variable.
    const uri = rawUri
      .trim()
      .replace(/^["']|["']$/g, "");

    // Make sure the application is receiving a MongoDB URI.
    if (!uri.startsWith("mongodb+srv://") && !uri.startsWith("mongodb://")) {
      throw new Error(
        "MONGODB_URI must start with mongodb+srv:// or mongodb://"
      );
    }

    // Use an explicit database name when one is not included in the URI.
    const uriPath = uri.match(/^[^:]+:\/\/[^/]+\/([^?]*)/)?.[1];

    const dbName =
      uriPath && uriPath.trim()
        ? decodeURIComponent(uriPath.split("/")[0])
        : "college_platform";

    const client =
      globalMongo.intentLinkMongoClient ??
      new MongoClient(uri, {
        serverSelectionTimeoutMS: 10000,
      });

    globalMongo.intentLinkMongoClient = client;

    globalMongo.intentLinkMongoDatabase = client
      .connect()
      .then(async (connected) => {
        const database = connected.db(dbName);

        await Promise.all([
          database.collection("users").createIndex(
            { email: 1 },
            {
              unique: true,
              name: "users_email_unique",
            }
          ),

          database.collection("communityInvitations").createIndex({
            inviteeId: 1,
            status: 1,
          }),

          database.collection("collaborationRequests").createIndex({
            senderId: 1,
            status: 1,
          }),

          database.collection("collaborationRequests").createIndex({
            receiverId: 1,
            status: 1,
          }),

          database.collection("projectJoinRequests").createIndex({
            projectId: 1,
            status: 1,
          }),

          database.collection("projectJoinRequests").createIndex({
            applicantId: 1,
            status: 1,
          }),

          database.collection("tasks").createIndex({
            communityId: 1,
            status: 1,
          }),

          database.collection("tasks").createIndex({
            projectId: 1,
            status: 1,
          }),

          database.collection("messages").createIndex({
            conversationId: 1,
            createdAt: 1,
          }),

          database.collection("notifications").createIndex({
            userId: 1,
            isRead: 1,
            createdAt: 1,
          }),
        ]);

        return database;
      })
      .catch((error) => {
        globalMongo.intentLinkMongoDatabase = undefined;
        globalMongo.intentLinkMongoClient = undefined;
        throw error;
      });
  }

  return globalMongo.intentLinkMongoDatabase;
}
