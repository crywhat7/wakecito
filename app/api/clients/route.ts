import { and, asc, eq } from "drizzle-orm";

import { clients } from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/require-session";
import { createClientBodySchema } from "@/lib/validators/clients";

export async function GET() {
  const gate = await requireSession();
  if (gate.error) {
    return gate.error;
  }
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: clients.id,
        name: clients.name,
        rtn: clients.rtn,
      })
      .from(clients)
      .where(
        and(eq(clients.company_id, gate.session.company.id), eq(clients.is_active, true)),
      )
      .orderBy(asc(clients.name));
    return jsonOk({ clients: rows });
  } catch (e) {
    console.error("[GET /api/clients]", e);
    return jsonErr("Error al listar clientes", 500);
  }
}

export async function POST(request: Request) {
  const gate = await requireSession();
  if (gate.error) {
    return gate.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErr("Cuerpo JSON inválido", 400);
  }

  const parsed = createClientBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonErr(first?.message ?? "Datos inválidos", 400);
  }

  try {
    const db = getDb();
    const [row] = await db
      .insert(clients)
      .values({
        company_id: gate.session.company.id,
        name: parsed.data.name,
        rtn: parsed.data.rtn ?? null,
      })
      .returning({
        id: clients.id,
        name: clients.name,
        rtn: clients.rtn,
      });

    if (!row) {
      return jsonErr("No se pudo crear el cliente", 500);
    }
    return jsonOk({ client: row }, 201);
  } catch (e) {
    console.error("[POST /api/clients]", e);
    return jsonErr("Error al crear cliente", 500);
  }
}
