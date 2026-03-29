import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireCrudAdmin } from "@/lib/crud/api-guard";
import { isCrudTableKey } from "@/lib/crud/registry";
import { insertRow, listRows } from "@/lib/crud/service";

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
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  try {
    const { rows, total } = await listRows(
      raw,
      gate.session,
      page,
      pageSize,
    );
    return jsonOk({ rows, total, page, pageSize });
  } catch (e) {
    console.error("[GET /api/crud/[table]]", e);
    return jsonErr("Error al listar filas", 500);
  }
}

export async function POST(request: Request, ctx: RouteCtx) {
  const gate = await requireCrudAdmin();
  if (gate.error) {
    return gate.error;
  }
  const { table: raw } = await ctx.params;
  if (!isCrudTableKey(raw)) {
    return jsonErr("Tabla no permitida", 400);
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
    const row = await insertRow(raw, gate.session, body as Record<string, unknown>);
    return jsonOk({ row }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear";
    if (msg.includes("No se permiten")) {
      return jsonErr(msg, 403);
    }
    console.error("[POST /api/crud/[table]]", e);
    return jsonErr(msg, 400);
  }
}
