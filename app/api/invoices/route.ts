import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { clients, companies, invoiceLines, invoices, products } from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import {
  buildLegalInvoiceNumber,
  validateRangeStartForInvoice,
} from "@/lib/invoice-legal-number";
import { requireSession } from "@/lib/auth/require-session";
import { createInvoiceBodySchema } from "@/lib/validators/invoices";

function moneyToStr(n: number): string {
  return n.toFixed(2);
}

/** Lista facturas + agregados para historial / dashboard. */
export async function GET(request: Request) {
  const gate = await requireSession();
  if (gate.error) {
    return gate.error;
  }
  const companyId = gate.session.company.id;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") || 50)),
  );
  const offset = Math.max(0, Number(searchParams.get("offset") || 0));

  try {
    const db = getDb();

    const [agg] = await db
      .select({
        totalSales: sql<string>`coalesce(sum(${invoices.total_amount}), 0)::text`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.company_id, companyId),
          isNull(invoices.voided_at),
        ),
      );

    const totalSales = Number.parseFloat(agg?.totalSales ?? "0") || 0;
    const totalExpenses = 0;
    const balance = totalSales - totalExpenses;

    const invRows = await db
      .select({
        id: invoices.id,
        total_amount: invoices.total_amount,
        currency: invoices.currency,
        status: invoices.status,
        payment_method: invoices.payment_method,
        created_at: invoices.created_at,
        voided_at: invoices.voided_at,
      })
      .from(invoices)
      .where(eq(invoices.company_id, companyId))
      .orderBy(desc(invoices.created_at))
      .limit(limit)
      .offset(offset);

    const ids = invRows.map((r) => r.id);
    const conceptById = new Map<string, string>();

    if (ids.length > 0) {
      const lines = await db
        .select({
          invoice_id: invoiceLines.invoice_id,
          product_name: invoiceLines.product_name,
          quantity: invoiceLines.quantity,
        })
        .from(invoiceLines)
        .where(inArray(invoiceLines.invoice_id, ids))
        .orderBy(asc(invoiceLines.invoice_id), asc(invoiceLines.line_number));

      for (const line of lines) {
        const q = Number.parseFloat(String(line.quantity));
        const qtyStr = Number.isNaN(q)
          ? String(line.quantity)
          : Number.isInteger(q)
            ? String(q)
            : String(q);
        const part = `${qtyStr} ${line.product_name}`;
        const prev = conceptById.get(line.invoice_id) ?? "";
        conceptById.set(
          line.invoice_id,
          prev ? `${prev}, ${part}` : part,
        );
      }
    }

    const rows = invRows.map((inv) => ({
      id: inv.id,
      concept: conceptById.get(inv.id) ?? "—",
      total_amount: String(inv.total_amount),
      currency: inv.currency,
      status: inv.status,
      payment_method: inv.payment_method,
      created_at: inv.created_at.toISOString(),
      voided_at: inv.voided_at ? inv.voided_at.toISOString() : null,
    }));

    return jsonOk({
      stats: {
        balance,
        totalSales,
        totalExpenses,
      },
      rows,
    });
  } catch (e) {
    console.error("[GET /api/invoices]", e);
    return jsonErr("Error al cargar facturas", 500);
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

  const parsed = createInvoiceBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonErr(first?.message ?? "Datos inválidos", 400);
  }

  const d = parsed.data;
  const companyId = gate.session.company.id;
  const userId = gate.session.user.id;

  const discount = Number.parseFloat(d.discount_amount || "0");
  if (Number.isNaN(discount) || discount < 0) {
    return jsonErr("Descuento inválido", 400);
  }

  try {
    const db = getDb();

    if (d.client_id) {
      const [c] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(eq(clients.id, d.client_id), eq(clients.company_id, companyId)),
        )
        .limit(1);
      if (!c) {
        return jsonErr("Cliente inválido", 400);
      }
    }

    const mergedQty = new Map<string, number>();
    for (const line of d.lines) {
      mergedQty.set(
        line.product_id,
        (mergedQty.get(line.product_id) ?? 0) + line.quantity,
      );
    }
    const mergedLines = [...mergedQty.entries()].map(
      ([product_id, quantity]) => ({ product_id, quantity }),
    );
    const uniqueIds = mergedLines.map((l) => l.product_id);

    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        price: products.price,
        currency: products.currency,
        stock_quantity: products.stock_quantity,
      })
      .from(products)
      .where(
        and(
          eq(products.company_id, companyId),
          eq(products.is_active, true),
          inArray(products.id, uniqueIds),
        ),
      );

    const byId = new Map(productRows.map((p) => [p.id, p]));
    for (const id of uniqueIds) {
      if (!byId.has(id)) {
        return jsonErr("Un producto no existe o no es de tu empresa", 400);
      }
    }

    let subtotal = 0;
    const lineData: {
      product_id: string;
      product_name: string;
      sku: string | null;
      quantity: number;
      unit_price: number;
      line_total: number;
    }[] = [];

    for (const line of mergedLines) {
      const p = byId.get(line.product_id)!;
      const unit = Number.parseFloat(String(p.price));
      if (Number.isNaN(unit)) {
        return jsonErr("Precio de producto inválido", 500);
      }
      const qty = line.quantity;
      if (p.stock_quantity < qty) {
        return jsonErr(
          `Stock insuficiente para «${p.name}» (disponible: ${p.stock_quantity})`,
          400,
        );
      }
      const lineTotal = Math.round(unit * qty * 100) / 100;
      subtotal += lineTotal;
      lineData.push({
        product_id: p.id,
        product_name: p.name,
        sku: p.sku,
        quantity: qty,
        unit_price: unit,
        line_total: lineTotal,
      });
    }

    const subtotalRounded = Math.round(subtotal * 100) / 100;
    if (discount > subtotalRounded + 0.0001) {
      return jsonErr("El descuento no puede superar el subtotal", 400);
    }

    const total = Math.round((subtotalRounded - discount) * 100) / 100;
    if (total < 0) {
      return jsonErr("Total inválido", 400);
    }

    const currency =
      lineData.length > 0
        ? String(byId.get(lineData[0].product_id)!.currency || "HNL")
        : "HNL";

    const result = await db.transaction(async (tx) => {
      const [co] = await tx
        .select({
          range_start: companies.range_start,
          invoice_next_number: companies.invoice_next_number,
        })
        .from(companies)
        .where(eq(companies.id, companyId))
        .for("update")
        .limit(1);

      if (!co) {
        throw new Error("NO_COMPANY");
      }
      if (!validateRangeStartForInvoice(co.range_start)) {
        throw new Error("NO_RANGE_START");
      }

      let legalNumber: string;
      try {
        legalNumber = buildLegalInvoiceNumber(
          co.range_start,
          co.invoice_next_number,
        );
      } catch {
        throw new Error("BAD_SEQUENCE");
      }

      const [inv] = await tx
        .insert(invoices)
        .values({
          company_id: companyId,
          client_id: d.client_id ?? null,
          sale_date: d.sale_date,
          status: d.status,
          currency,
          subtotal_amount: moneyToStr(subtotalRounded),
          discount_amount: moneyToStr(discount),
          tax_amount: "0",
          total_amount: moneyToStr(total),
          payment_method: d.status === "paid" ? d.payment_method! : null,
          installments: null,
          credit_due_date:
            d.status === "credit" && d.credit_due_date
              ? d.credit_due_date
              : null,
          invoice_number: legalNumber,
          created_by_user_id: userId,
        })
        .returning({ id: invoices.id, invoice_number: invoices.invoice_number });

      if (!inv) {
        throw new Error("insert invoice");
      }

      await tx
        .update(companies)
        .set({
          invoice_next_number: co.invoice_next_number + 1,
          updated_at: new Date(),
        })
        .where(eq(companies.id, companyId));

      let lineNum = 1;
      for (const row of lineData) {
        await tx.insert(invoiceLines).values({
          invoice_id: inv.id,
          line_number: lineNum,
          product_id: row.product_id,
          product_name: row.product_name,
          sku: row.sku,
          quantity: String(row.quantity),
          unit_price: moneyToStr(row.unit_price),
          line_total: moneyToStr(row.line_total),
        });
        lineNum += 1;

        await tx
          .update(products)
          .set({
            stock_quantity: sql`${products.stock_quantity} - ${row.quantity}`,
            updated_at: sql`now()`,
          })
          .where(eq(products.id, row.product_id));
      }

      return inv;
    });

    return jsonOk(
      {
        invoice: {
          id: result.id,
          invoice_number: result.invoice_number,
          total_amount: moneyToStr(total),
          currency,
        },
      },
      201,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    console.error("[POST /api/invoices]", e);
    if (msg === "NO_RANGE_START") {
      return jsonErr(
        "Configurá el «Rango autorizado — desde» en Configuración de la empresa para emitir facturas legales.",
        400,
      );
    }
    if (msg === "BAD_SEQUENCE" || msg === "INVALID_SEQUENCE") {
      return jsonErr("Correlativo de factura inválido. Revisá la configuración.", 400);
    }
    if (msg.includes("Stock") || msg.includes("insuficiente")) {
      return jsonErr(msg || "Stock insuficiente", 400);
    }
    return jsonErr("Error al registrar la venta", 500);
  }
}
