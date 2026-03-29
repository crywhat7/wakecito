/**
 * CRUD genérico: solo tablas declaradas aquí (lista blanca).
 * Multi-tenant: el scope restringe filas según la empresa de la sesión cuando aplica.
 */

export const CRUD_TABLE_KEYS = [
  "companies",
  "memberships",
  "users",
  "plans",
  "features",
  "plan_features",
  "clients",
  "purchases",
] as const;

export type CrudTableKey = (typeof CRUD_TABLE_KEYS)[number];

export function isCrudTableKey(s: string): s is CrudTableKey {
  return (CRUD_TABLE_KEYS as readonly string[]).includes(s);
}

export type CrudScope =
  | { type: "global" }
  | { type: "company_id" }
  | { type: "company_row" }
  | { type: "users_in_company" };

export type CrudTablePolicy = {
  scope: CrudScope;
  /** No se devuelven ni se pueden editar (ej. password_hash). */
  excludeColumns: string[];
  /** Visibles pero no escribibles en create/update. */
  readOnlyColumns: string[];
  forbidInsert?: boolean;
  forbidDelete?: boolean;
};

export const CRUD_POLICIES: Record<CrudTableKey, CrudTablePolicy> = {
  companies: {
    scope: { type: "company_row" },
    excludeColumns: [],
    readOnlyColumns: ["id", "created_at", "updated_at"],
    forbidInsert: true,
    forbidDelete: true,
  },
  memberships: {
    scope: { type: "company_id" },
    excludeColumns: [],
    readOnlyColumns: ["id", "created_at", "updated_at"],
    forbidDelete: false,
  },
  users: {
    scope: { type: "users_in_company" },
    excludeColumns: ["password_hash"],
    readOnlyColumns: ["id", "email", "created_at", "updated_at"],
    forbidInsert: true,
    forbidDelete: true,
  },
  plans: {
    scope: { type: "global" },
    excludeColumns: [],
    readOnlyColumns: ["id", "created_at", "updated_at"],
  },
  features: {
    scope: { type: "global" },
    excludeColumns: [],
    readOnlyColumns: ["id", "created_at", "updated_at"],
  },
  plan_features: {
    scope: { type: "global" },
    excludeColumns: [],
    readOnlyColumns: ["id"],
  },
  clients: {
    scope: { type: "company_id" },
    excludeColumns: [],
    readOnlyColumns: ["id", "created_at", "updated_at"],
    forbidDelete: false,
  },
  purchases: {
    scope: { type: "company_id" },
    excludeColumns: [],
    readOnlyColumns: ["id", "created_at", "updated_at"],
    forbidDelete: false,
  },
};

export function getCrudPolicy(table: CrudTableKey): CrudTablePolicy {
  return CRUD_POLICIES[table];
}
