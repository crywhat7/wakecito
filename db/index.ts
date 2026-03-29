import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/app/db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;
type Pg = ReturnType<typeof postgres>;

let singletonPg: Pg | undefined;
let singletonDb: Db | undefined;

/**
 * Cliente postgres.js (consultas parametrizadas / identificadores dinámicos con whitelist).
 */
export function getPg(): Pg {
  if (singletonPg) {
    return singletonPg;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL no está definida. Copiá .env.example a .env.local y pegá la URL de Supabase.",
    );
  }

  singletonPg = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  singletonDb = drizzle(singletonPg, { schema });
  return singletonPg;
}

/**
 * Cliente Drizzle + postgres.js.
 * Llamalo solo en runtime (handlers); así el build no exige DATABASE_URL.
 */
export function getDb(): Db {
  if (singletonDb) {
    return singletonDb;
  }
  getPg();
  return singletonDb!;
}
