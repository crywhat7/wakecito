import { getPg } from "@/db";
import type { PublicSession } from "@/lib/auth/session";

import {
  getCrudPolicy,
  type CrudTableKey,
  type CrudTablePolicy,
} from "@/lib/crud/registry";
import {
  introspectColumns,
  introspectForeignKeys,
  introspectPrimaryKey,
  type PgColumnMeta,
  type PgFkMeta,
} from "@/lib/crud/introspect";

/** postgres.js espera tipos concretos en .unsafe */
function pgArgs(a: unknown[]): never {
  return a as never;
}

function qTable(t: CrudTableKey): string {
  return `"${t}"`;
}

function assertCol(c: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(c)) {
    throw new Error("Identificador de columna inválido");
  }
  return c;
}

function visibleColumns(
  columns: PgColumnMeta[],
  policy: CrudTablePolicy,
): string[] {
  const ex = new Set(policy.excludeColumns);
  return columns.map((c) => c.column_name).filter((c) => !ex.has(c));
}

function selectList(alias: string, cols: string[]): string {
  return cols.map((c) => `${alias}."${assertCol(c)}"`).join(", ");
}

export type ColumnWithFk = PgColumnMeta & {
  foreign_table_name: string | null;
  foreign_column_name: string | null;
};

export async function getTableMeta(table: CrudTableKey): Promise<{
  columns: ColumnWithFk[];
  primaryKey: string[];
  foreignKeys: PgFkMeta[];
}> {
  const sql = getPg();
  const [columns, primaryKey, foreignKeys] = await Promise.all([
    introspectColumns(sql, table),
    introspectPrimaryKey(sql, table),
    introspectForeignKeys(sql, table),
  ]);
  const fkByCol = new Map(
    foreignKeys.map((fk) => [fk.column_name, fk]),
  );
  const withFk: ColumnWithFk[] = columns.map((c) => {
    const fk = fkByCol.get(c.column_name);
    return {
      ...c,
      foreign_table_name: fk?.foreign_table_name ?? null,
      foreign_column_name: fk?.foreign_column_name ?? null,
    };
  });
  return { columns: withFk, primaryKey, foreignKeys };
}

async function listRowsInternal(
  table: CrudTableKey,
  session: PublicSession,
  page: number,
  pageSize: number,
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const sql = getPg();
  const policy = getCrudPolicy(table);
  const colsMeta = await introspectColumns(sql, table);
  const colNames = visibleColumns(colsMeta, policy);
  const pkRows = await introspectPrimaryKey(sql, table);
  const pk = assertCol(pkRows[0] ?? "id");
  const limit = Math.min(Math.max(1, pageSize), 100);
  const offset = (Math.max(1, page) - 1) * limit;

  if (policy.scope.type === "global") {
    const [{ c }] = await sql.unsafe<{ c: string }[]>(
      `SELECT COUNT(*)::text AS c FROM ${qTable(table)}`,
    );
    const total = Number(c);
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT ${selectList("t", colNames)} FROM ${qTable(table)} AS t ORDER BY t."${pk}" DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return { rows: [...rows], total };
  }

  if (policy.scope.type === "company_row") {
    const [{ c }] = await sql.unsafe<{ c: string }[]>(
      `SELECT COUNT(*)::text AS c FROM ${qTable(table)} AS t WHERE t."${pk}" = $1`,
      [session.company.id],
    );
    const total = Number(c);
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT ${selectList("t", colNames)} FROM ${qTable(table)} AS t WHERE t."${pk}" = $1 ORDER BY t."${pk}" DESC LIMIT $2 OFFSET $3`,
      [session.company.id, limit, offset],
    );
    return { rows: [...rows], total };
  }

  if (policy.scope.type === "company_id") {
    const [{ c }] = await sql.unsafe<{ c: string }[]>(
      `SELECT COUNT(*)::text AS c FROM ${qTable(table)} AS t WHERE t.company_id = $1`,
      [session.company.id],
    );
    const total = Number(c);
    const rows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT ${selectList("t", colNames)} FROM ${qTable(table)} AS t WHERE t.company_id = $1 ORDER BY t."${pk}" DESC LIMIT $2 OFFSET $3`,
      [session.company.id, limit, offset],
    );
    return { rows: [...rows], total };
  }

  /* users_in_company */
  const [{ c }] = await sql.unsafe<{ c: string }[]>(
    `SELECT COUNT(*)::text AS c FROM users AS u
     WHERE EXISTS (
       SELECT 1 FROM memberships m
       WHERE m.user_id = u.id AND m.company_id = $1
     )`,
    [session.company.id],
  );
  const total = Number(c);
  const rows = await sql.unsafe<Record<string, unknown>[]>(
    `SELECT ${selectList("u", colNames)} FROM users AS u
     WHERE EXISTS (
       SELECT 1 FROM memberships m
       WHERE m.user_id = u.id AND m.company_id = $1
     )
     ORDER BY u."${pk}" DESC LIMIT $2 OFFSET $3`,
    [session.company.id, limit, offset],
  );
  return { rows: [...rows], total };
}

export async function listRows(
  table: CrudTableKey,
  session: PublicSession,
  page: number,
  pageSize: number,
) {
  return listRowsInternal(table, session, page, pageSize);
}

function writableKeys(
  columns: PgColumnMeta[],
  policy: CrudTablePolicy,
): Set<string> {
  const ex = new Set(policy.excludeColumns);
  const ro = new Set(policy.readOnlyColumns);
  const set = new Set<string>();
  for (const c of columns) {
    const n = c.column_name;
    if (ex.has(n) || ro.has(n)) continue;
    set.add(n);
  }
  return set;
}

function normalizePayload(
  raw: Record<string, unknown>,
  writable: Set<string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of writable) {
    if (Object.prototype.hasOwnProperty.call(raw, k)) {
      const v = raw[k];
      if (v === "" || v === undefined) {
        out[k] = null;
      } else {
        out[k] = v;
      }
    }
  }
  return out;
}

export async function insertRow(
  table: CrudTableKey,
  session: PublicSession,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const policy = getCrudPolicy(table);
  if (policy.forbidInsert) {
    throw new Error("No se permiten altas en esta tabla");
  }
  const sql = getPg();
  const colsMeta = await introspectColumns(sql, table);
  const writable = writableKeys(colsMeta, policy);
  if (
    table === "memberships" ||
    table === "clients" ||
    table === "purchases" ||
    table === "product_categories" ||
    table === "products"
  ) {
    writable.add("company_id");
  }
  const payload = normalizePayload(body, writable);
  if (
    table === "memberships" ||
    table === "clients" ||
    table === "purchases" ||
    table === "product_categories" ||
    table === "products"
  ) {
    payload.company_id = session.company.id;
  }

  const keys = Object.keys(payload).filter((k) => writable.has(k));
  if (keys.length === 0) {
    throw new Error("No hay campos para insertar");
  }
  const values = keys.map((k) => payload[k]);
  const colSql = keys.map((k) => `"${assertCol(k)}"`).join(", ");
  const ph = keys.map((_, i) => `$${i + 1}`).join(", ");
  const returning = visibleColumns(colsMeta, policy)
    .map((c) => `"${assertCol(c)}"`)
    .join(", ");

  const rows = await sql.unsafe<Record<string, unknown>[]>(
    `INSERT INTO ${qTable(table)} (${colSql}) VALUES (${ph}) RETURNING ${returning}`,
    pgArgs(values),
  );
  const row = rows[0];
  if (!row) {
    throw new Error("No se pudo crear el registro");
  }
  return row;
}

async function assertRowInScope(
  table: CrudTableKey,
  session: PublicSession,
  id: string,
): Promise<void> {
  const sql = getPg();
  const policy = getCrudPolicy(table);
  const pkRows = await introspectPrimaryKey(sql, table);
  const pk = assertCol(pkRows[0] ?? "id");

  if (policy.scope.type === "global") {
    const [r] = await sql.unsafe<{ ok: number }[]>(
      `SELECT 1 AS ok FROM ${qTable(table)} AS t WHERE t."${pk}" = $1::uuid LIMIT 1`,
      [id],
    );
    if (!r) throw new Error("Registro no encontrado");
    return;
  }
  if (policy.scope.type === "company_row") {
    const [r] = await sql.unsafe<{ ok: number }[]>(
      `SELECT 1 AS ok FROM ${qTable(table)} AS t WHERE t."${pk}" = $1::uuid AND t."${pk}" = $2::uuid LIMIT 1`,
      [id, session.company.id],
    );
    if (!r) throw new Error("Registro no encontrado");
    return;
  }
  if (policy.scope.type === "company_id") {
    const [r] = await sql.unsafe<{ ok: number }[]>(
      `SELECT 1 AS ok FROM ${qTable(table)} AS t WHERE t."${pk}" = $1::uuid AND t.company_id = $2::uuid LIMIT 1`,
      [id, session.company.id],
    );
    if (!r) throw new Error("Registro no encontrado");
    return;
  }
  const [r] = await sql.unsafe<{ ok: number }[]>(
    `SELECT 1 AS ok FROM users u
     WHERE u."${pk}" = $1::uuid
       AND EXISTS (
         SELECT 1 FROM memberships m
         WHERE m.user_id = u.id AND m.company_id = $2::uuid
       )
     LIMIT 1`,
    [id, session.company.id],
  );
  if (!r) throw new Error("Registro no encontrado");
}

export async function updateRow(
  table: CrudTableKey,
  session: PublicSession,
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const policy = getCrudPolicy(table);
  const sql = getPg();
  const colsMeta = await introspectColumns(sql, table);
  const writable = writableKeys(colsMeta, policy);
  const payload = normalizePayload(body, writable);
  await assertRowInScope(table, session, id);

  const pkRows = await introspectPrimaryKey(sql, table);
  const pk = assertCol(pkRows[0] ?? "id");

  const dataKeys = Object.keys(payload).filter((k) => writable.has(k));
  if (dataKeys.length === 0) {
    throw new Error("No hay cambios");
  }

  const hasUpdatedAt = colsMeta.some((c) => c.column_name === "updated_at");
  const values: unknown[] = dataKeys.map((k) => payload[k]);
  const setFragments = dataKeys.map(
    (k, i) => `"${assertCol(k)}" = $${i + 1}`,
  );
  /* postgres.js no serializa bien Date en .unsafe con pgArgs — usamos NOW() en SQL */
  if (hasUpdatedAt) {
    setFragments.push(`"updated_at" = NOW()`);
  }
  const nVals = values.length;

  let whereSql: string;
  let whereParams: unknown[];
  if (policy.scope.type === "global") {
    whereSql = `t."${pk}" = $${nVals + 1}::uuid`;
    whereParams = [...values, id];
  } else if (policy.scope.type === "company_row") {
    whereSql = `t."${pk}" = $${nVals + 1}::uuid AND t."${pk}" = $${nVals + 2}::uuid`;
    whereParams = [...values, id, session.company.id];
  } else if (policy.scope.type === "company_id") {
    whereSql = `t."${pk}" = $${nVals + 1}::uuid AND t.company_id = $${nVals + 2}::uuid`;
    whereParams = [...values, id, session.company.id];
  } else {
    whereSql = `t."${pk}" = $${nVals + 1}::uuid AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = t."${pk}" AND m.company_id = $${nVals + 2}::uuid
    )`;
    whereParams = [...values, id, session.company.id];
  }

  const tableSql =
    policy.scope.type === "users_in_company" ? `"users"` : qTable(table);

  const returning = visibleColumns(colsMeta, policy)
    .map((c) => `"${assertCol(c)}"`)
    .join(", ");

  const rows = await sql.unsafe<Record<string, unknown>[]>(
    `UPDATE ${tableSql} AS t SET ${setFragments.join(", ")} WHERE ${whereSql} RETURNING ${returning}`,
    pgArgs(whereParams),
  );

  const row = rows[0];
  if (!row) {
    throw new Error("No se pudo actualizar");
  }
  return row;
}

export async function deleteRow(
  table: CrudTableKey,
  session: PublicSession,
  id: string,
): Promise<void> {
  const policy = getCrudPolicy(table);
  if (policy.forbidDelete) {
    throw new Error("No se permiten bajas en esta tabla");
  }
  await assertRowInScope(table, session, id);
  const sql = getPg();
  const pkRows = await introspectPrimaryKey(sql, table);
  const pk = assertCol(pkRows[0] ?? "id");
  const pol = getCrudPolicy(table);

  let whereSql: string;
  let whereParams: unknown[];
  if (pol.scope.type === "global") {
    whereSql = `"${pk}" = $1::uuid`;
    whereParams = [id];
  } else if (pol.scope.type === "company_row") {
    whereSql = `"${pk}" = $1::uuid AND "${pk}" = $2::uuid`;
    whereParams = [id, session.company.id];
  } else if (pol.scope.type === "company_id") {
    whereSql = `"${pk}" = $1::uuid AND company_id = $2::uuid`;
    whereParams = [id, session.company.id];
  } else {
    throw new Error("No se puede eliminar desde este contexto");
  }

  await sql.unsafe(
    `DELETE FROM ${qTable(table)} WHERE ${whereSql}`,
    pgArgs(whereParams),
  );
}

export async function fetchFkOptions(
  table: CrudTableKey,
  column: string,
  session: PublicSession,
): Promise<{ value: string; label: string }[]> {
  assertCol(column);
  const sql = getPg();
  const fks = await introspectForeignKeys(sql, table);
  const fk = fks.find((f) => f.column_name === column);
  if (!fk) {
    return [];
  }
  const ref = fk.foreign_table_name;
  if (!/^[a-z_][a-z0-9_]*$/i.test(ref)) {
    return [];
  }
  const refQ = `"${ref}"`;

  if (ref === "plans") {
    const rows = await sql.unsafe<{ id: string; name: string }[]>(
      `SELECT id::text, name FROM ${refQ} ORDER BY name ASC LIMIT 500`,
    );
    return rows.map((r) => ({ value: r.id, label: r.name }));
  }
  if (ref === "features") {
    const rows = await sql.unsafe<{ id: string; name: string }[]>(
      `SELECT id::text, name FROM ${refQ} ORDER BY name ASC LIMIT 500`,
    );
    return rows.map((r) => ({ value: r.id, label: r.name }));
  }
  if (ref === "companies") {
    const rows = await sql.unsafe<{ id: string; name: string }[]>(
      `SELECT id::text, name FROM ${refQ} WHERE id = $1::uuid`,
      [session.company.id],
    );
    return rows.map((r) => ({ value: r.id, label: r.name }));
  }
  if (ref === "users") {
    const rows = await sql.unsafe<{ id: string; label: string }[]>(
      `SELECT u.id::text,
              COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(u.email), ''), u.id::text) AS label
       FROM users u
       WHERE EXISTS (
         SELECT 1 FROM memberships m
         WHERE m.user_id = u.id AND m.company_id = $1::uuid
       )
       ORDER BY label ASC
       LIMIT 500`,
      [session.company.id],
    );
    return rows.map((r) => ({ value: r.id, label: r.label }));
  }

  if (ref === "product_categories") {
    const rows = await sql.unsafe<{ id: string; name: string }[]>(
      `SELECT id::text, name FROM "product_categories"
       WHERE company_id = $1::uuid AND is_active = true
       ORDER BY sort_order ASC, name ASC
       LIMIT 500`,
      [session.company.id],
    );
    return rows.map((r) => ({ value: r.id, label: r.name }));
  }

  if (ref === "units_of_measure") {
    const rows = await sql.unsafe<{ id: string; label: string }[]>(
      `SELECT id::text,
              TRIM(name) || ' (' || TRIM(code) || ')' AS label
       FROM "units_of_measure"
       WHERE is_active = true
       ORDER BY sort_order ASC, name ASC
       LIMIT 200`,
    );
    return rows.map((r) => ({ value: r.id, label: r.label }));
  }

  const rows = await sql.unsafe<{ id: string; name: string | null }[]>(
    `SELECT id::text, name FROM ${refQ} ORDER BY name ASC LIMIT 200`,
  );
  return rows.map((r) => ({
    value: r.id,
    label: r.name?.trim() || r.id,
  }));
}
