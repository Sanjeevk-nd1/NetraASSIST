// scripts/sync-qdrant.ts
import "dotenv/config";
import { upsertDocuments } from "../server/services/vector-store";
import { storage } from "../server/storage";

async function main() {
  const docs = await storage.getAllDocuments(); // expects [{id, title?, content, updatedAt?}, ...]
  const valid = (docs || []).filter((d: any) => d?.content && String(d.content).trim().length > 0);
  console.log(`Syncing ${valid.length} documents to Qdrant…`);
  await upsertDocuments(valid);
  console.log("Sync complete.");
}

main().catch((e) => {
  console.error("Sync error:", e);
  process.exit(1);
});
