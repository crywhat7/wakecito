import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireCrudAdmin } from "@/lib/crud/api-guard";
import { isCrudTableKey } from "@/lib/crud/registry";
import { deleteRow, updateRow } from "@/lib/crud/service";

type RouteCtx = { params: Promise<{ table: string; id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const gate = await requireCrudAdmin();
  if (gate.error) {
    return gate.error;
  }
  const { table: raw, id } = await ctx.params;
  if (!isCrudTableKey(raw)) {
    return jsonErr("Tabla no permitida", 400);
  }
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return jsonErr("ID inválido", 400);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErr("Cuerpo JSON inválido", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonErr("Se esperaba un objeto JSON", 400);
  }
  try {
    const row = await updateRow(
      raw,
      gate.session,
      id,
      body as Record<string, unknown>,
    );
    return jsonOk({ row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al actualizar";
    if (msg === "Registro no encontrado") {
      return jsonErr(msg, 404);
    }
    if (msg === "No hay cambios") {
      return jsonErr(msg, 400);
    }
    console.error("[PATCH /api/crud/[table]/[id]]", e);
    return jsonErr(msg, 400);
  }
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  const gate = await requireCrudAdmin();
  if (gate.error) {
    return gate.error;
  }
  const { table: raw, id } = await ctx.params;
  if (!isCrudTableKey(raw)) {
    return jsonErr("Tabla no permitida", 400);
  }
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return jsonErr("ID inválido", 400);
  }
  try {
    await deleteRow(raw, gate.session, id);
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al eliminar";
    if (msg === "Registro no encontrado") {
      return jsonErr(msg, 404);
    }
    if (msg.includes("No se permiten")) {
      return jsonErr(msg, 403);
    }
    if (msg.includes("No se puede eliminar")) {
      return jsonErr(msg, 400);
    }
    console.error("[DELETE /api/crud/[table]/[id]]", e);
    return jsonErr(msg, 500);
  }
}
