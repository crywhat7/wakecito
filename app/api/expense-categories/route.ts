import { and, asc, eq } from "drizzle-orm";

import { expenseCategories } from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/require-session";
import { createExpenseCategoryBodySchema } from "@/lib/validators/expenses";

export async function GET() {
  const gate = await requireSession();
  if (gate.error) {
    return gate.error;
  }
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: expenseCategories.id,
        name: expenseCategories.name,
        sort_order: expenseCategories.sort_order,
      })
      .from(expenseCategories)
      .where(
        and(
          eq(expenseCategories.company_id, gate.session.company.id),
          eq(expenseCategories.is_active, true),
        ),
      )
      .orderBy(asc(expenseCategories.sort_order), asc(expenseCategories.name));
    return jsonOk({ categories: rows });
  } catch (e) {
    console.error("[GET /api/expense-categories]", e);
    return jsonErr("Error al listar categorías de gasto", 500);
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
  const parsed = createExpenseCategoryBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonErr(first?.message ?? "Datos inválidos", 400);
  }
  try {
    const db = getDb();
    const [row] = await db
      .insert(expenseCategories)
      .values({
        company_id: gate.session.company.id,
        name: parsed.data.name,
      })
      .returning({
        id: expenseCategories.id,
        name: expenseCategories.name,
      });
    if (!row) {
      return jsonErr("No se pudo crear la categoría", 500);
    }
    return jsonOk({ category: row }, 201);
  } catch (e) {
    console.error("[POST /api/expense-categories]", e);
    return jsonErr("Error al crear categoría de gasto", 500);
  }
}
