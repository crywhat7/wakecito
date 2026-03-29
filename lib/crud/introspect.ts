import type { Sql } from "postgres";

import type { CrudTableKey } from "@/lib/crud/registry";

export type PgColumnMeta = {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
};

export type PgFkMeta = {
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
};

export async function introspectColumns(
  sql: Sql,
  table: CrudTableKey,
): Promise<PgColumnMeta[]> {
  const rows = await sql<PgColumnMeta[]>`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
    ORDER BY ordinal_position
  `;
  return [...rows];
}

export async function introspectPrimaryKey(
  sql: Sql,
  table: CrudTableKey,
): Promise<string[]> {
  const rows = await sql<{ column_name: string }[]>`
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = ${table}
    ORDER BY kcu.ordinal_position
  `;
  return rows.map((r) => r.column_name);
}

export async function introspectForeignKeys(
  sql: Sql,
  table: CrudTableKey,
): Promise<PgFkMeta[]> {
  const rows = await sql<PgFkMeta[]>`
    SELECT
      kcu.column_name AS column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = ${table}
  `;
  return [...rows];
}
