import { and, eq } from "drizzle-orm";

import { products } from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/require-session";
import { updateProductStockBodySchema } from "@/lib/validators/inventory";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireSession();
  if (gate.error) {
    return gate.error;
  }

  const { id } = await ctx.params;
  if (!uuidRe.test(id)) {
    return jsonErr("ID inválido", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErr("Cuerpo JSON inválido", 400);
  }

  const parsed = updateProductStockBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonErr(first?.message ?? "Datos inválidos", 400);
  }

  try {
    const db = getDb();
    const companyId = gate.session.company.id;

    const [updated] = await db
      .update(products)
      .set({
        stock_quantity: parsed.data.stock_quantity,
        updated_at: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.company_id, companyId)))
      .returning({
        id: products.id,
        stock_quantity: products.stock_quantity,
      });

    if (!updated) {
      return jsonErr("Producto no encontrado", 404);
    }

    return jsonOk({ product: updated });
  } catch (e) {
    console.error("[PATCH /api/products/[id]/stock]", e);
    return jsonErr("Error al actualizar el stock", 500);
  }
}
