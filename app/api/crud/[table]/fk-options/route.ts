import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireCrudAdmin } from "@/lib/crud/api-guard";
import { isCrudTableKey } from "@/lib/crud/registry";
import { fetchFkOptions } from "@/lib/crud/service";

type RouteCtx = { params: Promise<{ table: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  const gate = await requireCrudAdmin();
  if (gate.error) {
    return gate.error;
  }
  const { table: raw } = await ctx.params;
  if (!isCrudTableKey(raw)) {
    return jsonErr("Tabla no permitida", 400);
  }
  const column = new URL(request.url).searchParams.get("column");
  if (!column) {
    return jsonErr("Falta el parámetro column", 400);
  }
  try {
    const options = await fetchFkOptions(raw, column, gate.session);
    return jsonOk({ options });
  } catch (e) {
    console.error("[GET /api/crud/.../fk-options]", e);
    return jsonErr("Error al cargar opciones", 500);
  }
}
