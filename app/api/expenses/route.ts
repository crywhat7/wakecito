import { and, count, desc, eq, inArray } from "drizzle-orm";

import {
  expenseCategories,
  expenseLines,
  expenses,
  products,
} from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/require-session";
import { createExpenseBodySchema } from "@/lib/validators/expenses";

function parseIntParam(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function GET(request: Request) {
  const gate = await requireSession();
  if (gate.error) {
    return gate.error;
  }

  const url = new URL(request.url);
  const page = parseIntParam(url.searchParams.get("page"), 1, 1, 10_000);
  const pageSize = parseIntParam(url.searchParams.get("page_size"), 25, 1, 100);
  const offset = (page - 1) * pageSize;
  const companyId = gate.session.company.id;

  try {
    const db = getDb();

    const [countRow] = await db
      .select({ n: count() })
      .from(expenses)
      .where(eq(expenses.company_id, companyId));

    const total = Number(countRow?.n ?? 0);

    const rows = await db
      .select({
        id: expenses.id,
        expense_date: expenses.expense_date,
        total_amount: expenses.total_amount,
        currency: expenses.currency,
        payment_type: expenses.payment_type,
        expected_payment_date: expenses.expected_payment_date,
        description: expenses.description,
        category_id: expenses.category_id,
        category_name: expenseCategories.name,
      })
      .from(expenses)
      .innerJoin(
        expenseCategories,
        eq(expenses.category_id, expenseCategories.id),
      )
      .where(eq(expenses.company_id, companyId))
      .orderBy(desc(expenses.expense_date), desc(expenses.created_at))
      .limit(pageSize)
      .offset(offset);

    const list = rows.map((r) => ({
      ...r,
      total_amount: String(r.total_amount),
    }));

    return jsonOk({
      expenses: list,
      pagination: { page, page_size: pageSize, total },
    });
  } catch (e) {
    console.error("[GET /api/expenses]", e);
    return jsonErr("Error al listar gastos", 500);
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

  const parsed = createExpenseBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonErr(first?.message ?? "Datos inválidos", 400);
  }

  const d = parsed.data;
  const companyId = gate.session.company.id;
  const totalStr = d.total_amount.trim();
  const lines = d.lines ?? [];

  try {
    const db = getDb();

    const [cat] = await db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(
        and(
          eq(expenseCategories.id, d.category_id),
          eq(expenseCategories.company_id, companyId),
          eq(expenseCategories.is_active, true),
        ),
      )
      .limit(1);

    if (!cat) {
      return jsonErr("La categoría no existe o no es de tu empresa", 400);
    }

    const productIds = lines.map((l) => l.product_id);
    if (productIds.length > 0) {
      const productRows = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.company_id, companyId),
            eq(products.is_active, true),
            inArray(products.id, productIds),
          ),
        );

      if (productRows.length !== new Set(productIds).size) {
        return jsonErr(
          "Uno o más productos no existen o no son de tu empresa",
          400,
        );
      }
    }

    const userId = gate.session.user.id;

    const result = await db.transaction(async (tx) => {
      const [exp] = await tx
        .insert(expenses)
        .values({
          company_id: companyId,
          category_id: d.category_id,
          expense_date: d.expense_date,
          total_amount: totalStr,
          currency: d.currency.trim() || "HNL",
          payment_type: d.payment_type,
          expected_payment_date:
            d.payment_type === "credit" ? d.expected_payment_date! : null,
          description: d.description?.trim() || null,
          reference: d.reference?.trim() || null,
          payee_name: d.payee_name?.trim() || null,
          created_by_user_id: userId,
        })
        .returning({
          id: expenses.id,
          expense_date: expenses.expense_date,
          total_amount: expenses.total_amount,
        });

      if (!exp) {
        throw new Error("insert expense");
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        await tx.insert(expenseLines).values({
          expense_id: exp.id,
          line_number: i + 1,
          product_id: line.product_id,
          quantity: line.quantity,
          unit_cost: line.unit_cost?.trim() || null,
        });

        const costStr = line.unit_cost?.trim() || null;
        const [stockRow] = await tx
          .select({ stock_quantity: products.stock_quantity })
          .from(products)
          .where(
            and(
              eq(products.id, line.product_id),
              eq(products.company_id, companyId),
            ),
          )
          .limit(1);
        if (!stockRow) {
          throw new Error("product stock");
        }
        await tx
          .update(products)
          .set({
            stock_quantity: stockRow.stock_quantity + line.quantity,
            updated_at: new Date(),
            ...(costStr ? { cost_price: costStr } : {}),
          })
          .where(
            and(
              eq(products.id, line.product_id),
              eq(products.company_id, companyId),
            ),
          );
      }

      return exp;
    });

    return jsonOk(
      {
        expense: {
          id: result.id,
          expense_date: result.expense_date,
          total_amount: String(result.total_amount),
          lines_applied: lines.length,
        },
      },
      201,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    console.error("[POST /api/expenses]", e);
    if (msg.includes("expenses") && msg.includes("constraint")) {
      return jsonErr("Datos inválidos (revisá fechas y tipo de pago)", 400);
    }
    return jsonErr("Error al registrar el gasto", 500);
  }
}
