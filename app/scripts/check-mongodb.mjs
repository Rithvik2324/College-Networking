import nextEnv from "@next/env";
import { MongoClient } from "mongodb";

nextEnv.loadEnvConfig(process.cwd());

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is missing from the local environment.");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  await client.db().command({ ping: 1 });
  console.log("MongoDB Atlas connection successful.");
} catch (error) {
  const name = error instanceof Error ? error.name : "UnknownError";
  const code = error && typeof error === "object" && "code" in error ? ` (${String(error.code)})` : "";
  const message = error instanceof Error
    ? error.message.replace(/mongodb(?:\+srv)?:\/\/[^@\s]+@/gi, "mongodb://[credentials hidden]@")
    : "Connection failed.";
  console.error(`MongoDB Atlas connection failed: ${name}${code}: ${message}`);
  process.exitCode = 1;
} finally {
  await client.close();
}
