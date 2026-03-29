import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireCrudAdmin } from "@/lib/crud/api-guard";
import { getCrudPolicy, isCrudTableKey } from "@/lib/crud/registry";
import { getTableMeta } from "@/lib/crud/service";

type RouteCtx = { params: Promise<{ table: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const gate = await requireCrudAdmin();
  if (gate.error) {
    return gate.error;
  }
  const { table: raw } = await ctx.params;
  if (!isCrudTableKey(raw)) {
    return jsonErr("Tabla no permitida", 400);
  }
  try {
    const meta = await getTableMeta(raw);
    const policy = getCrudPolicy(raw);
    return jsonOk({
      ...meta,
      policy: {
        forbidInsert: Boolean(policy.forbidInsert),
        forbidDelete: Boolean(policy.forbidDelete),
        excludeColumns: policy.excludeColumns,
        readOnlyColumns: policy.readOnlyColumns,
      },
    });
  } catch (e) {
    console.error("[GET /api/crud/.../meta]", e);
    return jsonErr("Error al leer metadatos", 500);
  }
}
