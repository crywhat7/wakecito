import { and, asc, eq } from "drizzle-orm";

import { productCategories } from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/require-session";
import { createProductCategoryBodySchema } from "@/lib/validators/products";

export async function GET() {
  const gate = await requireSession();
  if (gate.error) {
    return gate.error;
  }
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: productCategories.id,
        name: productCategories.name,
        sort_order: productCategories.sort_order,
      })
      .from(productCategories)
      .where(
        and(
          eq(productCategories.company_id, gate.session.company.id),
          eq(productCategories.is_active, true),
        ),
      )
      .orderBy(asc(productCategories.sort_order), asc(productCategories.name));
    return jsonOk({ categories: rows });
  } catch (e) {
    console.error("[GET /api/product-categories]", e);
    return jsonErr("Error al listar categorías", 500);
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
  const parsed = createProductCategoryBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonErr(first?.message ?? "Datos inválidos", 400);
  }
  try {
    const db = getDb();
    const [row] = await db
      .insert(productCategories)
      .values({
        company_id: gate.session.company.id,
        name: parsed.data.name,
      })
      .returning({
        id: productCategories.id,
        name: productCategories.name,
      });
    if (!row) {
      return jsonErr("No se pudo crear la categoría", 500);
    }
    return jsonOk({ category: row }, 201);
  } catch (e) {
    console.error("[POST /api/product-categories]", e);
    return jsonErr("Error al crear categoría", 500);
  }
}
