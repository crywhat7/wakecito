import { and, eq, sql } from "drizzle-orm";

import { invoiceLines, invoices, products } from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/require-session";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: RouteCtx) {
  const gate = await requireSession();
  if (gate.error) {
    return gate.error;
  }
  const companyId = gate.session.company.id;
  const { id } = await ctx.params;

  try {
    const db = getDb();

    const [cur] = await db
      .select({
        id: invoices.id,
        voided_at: invoices.voided_at,
      })
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.company_id, companyId)))
      .limit(1);

    if (!cur) {
      return jsonErr("Factura no encontrada", 404);
    }
    if (cur.voided_at) {
      return jsonErr("La factura ya está anulada", 400);
    }

    await db.transaction(async (tx) => {
      const lines = await tx
        .select({
          product_id: invoiceLines.product_id,
          quantity: invoiceLines.quantity,
        })
        .from(invoiceLines)
        .where(eq(invoiceLines.invoice_id, id));

      await tx
        .update(invoices)
        .set({
          voided_at: sql`now()`,
          updated_at: sql`now()`,
        })
        .where(eq(invoices.id, id));

      for (const line of lines) {
        if (!line.product_id) continue;
        const qty = Number.parseFloat(String(line.quantity));
        if (Number.isNaN(qty) || qty === 0) continue;
        await tx
          .update(products)
          .set({
            stock_quantity: sql`${products.stock_quantity} + ${qty}`,
            updated_at: sql`now()`,
          })
          .where(
            and(
              eq(products.id, line.product_id),
              eq(products.company_id, companyId),
            ),
          );
      }
    });

    return jsonOk({ ok: true });
  } catch (e) {
    console.error("[POST /api/invoices/[id]/void]", e);
    return jsonErr("Error al anular la factura", 500);
  }
}
