import nextEnv from "@next/env";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getFirebaseAdminApp } from "../lib/firebase-admin.ts";

const directory = fileURLToPath(new URL("../", import.meta.url));
nextEnv.loadEnvConfig(directory);

try {
  if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Cloud rules cannot be deployed through an emulator configuration.");
  const app = getFirebaseAdminApp();
  const token = await app.options.credential.getAccessToken();
  const base = `https://firebaserules.googleapis.com/v1/projects/${app.options.projectId}`;
  const rules = await readFile(join(directory, "firestore.rules"), "utf8");
  const headers = { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" };
  const request = async (url, method = "GET", data) => {
    const response = await fetch(url, { method, headers, body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Rules API returned HTTP ${response.status}.`);
    return response.json();
  };
  const release = await request(`${base}/releases/cloud.firestore`);
  const current = await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
  const identical = current.source?.files?.length === 1 && current.source.files[0].content.trim() === rules.trim();
  if (process.argv.includes("--verify")) {
    if (!identical) throw new Error("Deployed rules do not match the server-only rules file.");
    console.log("Verified: Firestore client reads and writes are denied; server Admin access is unchanged.");
  } else if (identical) {
    console.log("Server-only Firestore rules are already deployed.");
  } else {
    await mkdir(join(directory, ".backups"), { recursive: true });
    await writeFile(join(directory, ".backups", `firestore-rules-${Date.now()}.json`), JSON.stringify(current, null, 2), { flag: "wx" });
    const created = await request(`${base}/rulesets`, "POST", { source: { files: [{ name: "firestore.rules", content: rules }] } });
    await request(`${base}/releases/cloud.firestore`, "PATCH", { release: { name: `projects/${app.options.projectId}/releases/cloud.firestore`, rulesetName: created.name }, updateMask: "rulesetName" });
    console.log("Deployed server-only Firestore rules. Previous rules were backed up under .backups.");
  }
} catch (error) {
  console.error("Firestore rules could not be deployed or verified. Publish firestore.rules in Firebase Console, or grant this server account Firebase Rules access.");
  console.error(error instanceof Error && /^(Rules API|Deployed rules|Cloud rules)/.test(error.message) ? error.message : "Check server credentials and network access.");
  process.exitCode = 1;
}