import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/app/db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __wakecito_db: Db | undefined;
  var __wakecito_pg: ReturnType<typeof postgres> | undefined;
}

/**
 * Cliente Drizzle + postgres.js.
 * Llamalo solo en runtime (handlers, server actions); así el build no exige DATABASE_URL.
 */
export function getDb(): Db {
  if (globalThis.__wakecito_db) {
    return globalThis.__wakecito_db;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL no está definida. Copiá .env.example a .env.local y pegá la URL de Supabase.",
    );
  }

  const client =
    globalThis.__wakecito_pg ??
    postgres(url, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__wakecito_pg = client;
  }

  globalThis.__wakecito_db = drizzle(client, { schema });
  return globalThis.__wakecito_db;
}
