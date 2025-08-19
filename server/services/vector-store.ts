// src/services/vector-store.ts
import { QdrantClient } from "@qdrant/js-client-rest";
import fetch from "node-fetch";
import crypto from "crypto";

type DocRecord = {
  id: string | number;
  title?: string;
  content: string;
  updatedAt?: string | Date;
};

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "documents";
const QDRANT_DISTANCE: "Cosine" | "Dot" | "Euclid" = (process.env.QDRANT_DISTANCE as any) || "Cosine";

const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || "";
// Embeddings deployment + api-version (different from chat!)
const AZURE_OPENAI_EMBEDDINGS_INSTANCE = process.env.AZURE_OPENAI_API_INSTANCE_NAME || "";
const AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME = process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME || ""; // e.g., "text-embedding-3-large"
const AZURE_OPENAI_API_VERSION_EMBED = process.env.AZURE_OPENAI_API_VERSION_EMBED || "2024-02-15-preview";

if (!AZURE_OPENAI_API_KEY) throw new Error("AZURE_OPENAI_API_KEY is required");
if (!AZURE_OPENAI_EMBEDDINGS_INSTANCE) throw new Error("AZURE_OPENAI_API_INSTANCE_NAME is required (for embeddings)");
if (!AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME) throw new Error("AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT is required");

const EMBEDDING_URL = `https://${AZURE_OPENAI_EMBEDDINGS_INSTANCE}.openai.azure.com/openai/deployments/${AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME}/embeddings?api-version=${AZURE_OPENAI_API_VERSION_EMBED}`;

export const qdrant = new QdrantClient({ url: QDRANT_URL });

// ---------- Embeddings ----------
export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify({ input: text }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Azure Embeddings error: ${res.status} ${res.statusText} ${msg}`);
  }
  const data = await res.json();
  const vec = data?.data?.[0]?.embedding;
  if (!Array.isArray(vec)) throw new Error("Invalid embedding response");
  return vec;
}

// ---------- Collection init ----------
export async function ensureCollection(vectorSize: number) {
  try {
    const existing = await qdrant.getCollection(QDRANT_COLLECTION);
    const size = (existing as any)?.result?.config?.params?.vectors?.size;
    if (size && size !== vectorSize) {
      console.warn(
        `[Qdrant] Existing collection "${QDRANT_COLLECTION}" has size=${size}, expected=${vectorSize}. ` +
        `Consider recreating the collection if embeddings model changed.`
      );
    }
    return;
  } catch {
    // create if not exists
  }

  await qdrant.createCollection(QDRANT_COLLECTION, {
    vectors: { size: vectorSize, distance: QDRANT_DISTANCE },
    optimizers_config: {
      default_segment_number: 2,
    },
  });

  // Optional: payload index for faster text filters (not required for our re-ranker)
  try {
    await qdrant.createPayloadIndex(QDRANT_COLLECTION, {
      field_name: "content",
      field_schema: "text",
    });
  } catch (e) {
    console.warn("[Qdrant] createPayloadIndex(content) warning:", (e as Error).message);
  }
}

// ---------- Chunking ----------
function chunkText(text: string, chunkSize = 1000, overlap = 150): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    const chunk = text.slice(i, end).trim();
    if (chunk) chunks.push(chunk);
    if (end === text.length) break;
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return chunks;
}

// ---------- Upsert docs (bootstrap or sync) ----------
export async function upsertDocuments(docs: DocRecord[]) {
  if (!docs?.length) return;

  // Lazy init: get vector size from first embedding
  const probeEmbedding = await generateEmbedding("hello");
  await ensureCollection(probeEmbedding.length);

  for (const doc of docs) {
    if (!doc?.content) continue;
    const chunks = chunkText(doc.content);
    // Batch embeddings to reduce overhead
    const embeddings = await Promise.all(chunks.map((c) => generateEmbedding(c)));

    const points = embeddings.map((vector, idx) => ({
      id: Number.isFinite(doc.id) ? Number(doc.id) * 1_000_000 + idx : hashToInt(`${doc.id}:${idx}`),
      vector,
      payload: {
        doc_id: doc.id,
        title: doc.title || "",
        content: chunks[idx],
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
        chunk_index: idx,
      },
    }));

    await qdrant.upsert(QDRANT_COLLECTION, { points });
  }
}

function hashToInt(s: string): number {
  const h = crypto.createHash("sha1").update(s).digest("hex").slice(0, 12); // 48-bit
  return parseInt(h, 16);
}

// ---------- Hybrid search (fast) ----------
// Approach: wide semantic search in Qdrant -> local keyword-aware re-rank -> topK
export type RetrievedChunk = {
  id: number | string;
  score: number;           // final fused score
  vectorScore: number;     // original qdrant similarity
  keywordScore: number;    // local keyword score
  payload: { content: string; title?: string; doc_id?: string | number; chunk_index?: number };
};

export async function hybridSearch(query: string, topK = 6, widen = 40, alpha = 0.7): Promise<RetrievedChunk[]> {
  // alpha: weight for vector vs keyword (0..1)
  const queryEmbedding = await generateEmbedding(query);

  // Ensure collection exists (in case app starts with empty DB)
  await ensureCollection(queryEmbedding.length);

  // Wide semantic search to get candidate pool
  const vectorResults = await qdrant.search(QDRANT_COLLECTION, {
    vector: queryEmbedding,
    limit: Math.max(topK, widen),
    with_payload: true,
  });

  // Local keyword score (simple fast scorer)
  const qTokens = tokenize(query);
  const rescored = vectorResults.map((r) => {
    const text = (r.payload as any)?.content || "";
    const keywordScore = keywordOverlapScore(qTokens, tokenize(text));
    const fused = alpha * r.score + (1 - alpha) * keywordScore;
    return {
      id: r.id!,
      score: fused,
      vectorScore: r.score,
      keywordScore,
      payload: r.payload as any,
    };
  });

  // Sort by fused score desc and pick topK
  rescored.sort((a, b) => b.score - a.score);
  return rescored.slice(0, topK);
}

function tokenize(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function keywordOverlapScore(qTokens: string[], dTokens: string[]): number {
  if (qTokens.length === 0 || dTokens.length === 0) return 0;
  const dSet = new Set(dTokens);
  let match = 0;
  for (const t of qTokens) if (dSet.has(t)) match++;
  // normalize by query length; cap to 1.0
  return Math.min(1, match / qTokens.length);
}

// ---------- Helper to format context ----------
export function buildContext(chunks: RetrievedChunk[], maxChars = 4000): { context: string; sources: string[] } {
  const parts: string[] = [];
  const sources: string[] = [];
  for (const c of chunks) {
    const title = c.payload?.title ? ` (${c.payload.title})` : "";
    parts.push(`• ${c.payload?.content}`);
    sources.push(`doc:${c.payload?.doc_id ?? c.id}${title}#${c.payload?.chunk_index ?? 0}`);
  }
  let context = parts.join("\n\n");
  if (context.length > maxChars) context = context.slice(0, maxChars) + "…";
  return { context, sources };
}
