// shared/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Connect using environment variable or fallback
const client = postgres(process.env.DATABASE_URL!, { max: 10 }); // Use `!` only if you're sure the env var exists
export const db = drizzle(client);
