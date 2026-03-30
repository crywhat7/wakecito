import { asc, eq } from "drizzle-orm";

import { unitsOfMeasure } from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/require-session";

export async function GET() {
  const gate = await requireSession();
  if (gate.error) {
    return gate.error;
  }
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: unitsOfMeasure.id,
        code: unitsOfMeasure.code,
        name: unitsOfMeasure.name,
        sort_order: unitsOfMeasure.sort_order,
      })
      .from(unitsOfMeasure)
      .where(eq(unitsOfMeasure.is_active, true))
      .orderBy(asc(unitsOfMeasure.sort_order), asc(unitsOfMeasure.name));
    return jsonOk({ units: rows });
  } catch (e) {
    console.error("[GET /api/units-of-measure]", e);
    return jsonErr("Error al listar unidades", 500);
  }
}
