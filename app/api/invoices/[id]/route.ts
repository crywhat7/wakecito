import { and, asc, eq, inArray } from "drizzle-orm";

import {
  clients,
  companies,
  invoiceLines,
  invoices,
  productImages,
} from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/require-session";
import { patchInvoiceBodySchema } from "@/lib/validators/invoice-detail";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  const gate = await requireSession();
  if (gate.error) {
    return gate.error;
  }
  const companyId = gate.session.company.id;
  const { id } = await ctx.params;

  try {
    const db = getDb();

    const [inv] = await db
      .select({
        id: invoices.id,
        company_id: invoices.company_id,
        client_id: invoices.client_id,
        sale_date: invoices.sale_date,
        status: invoices.status,
        currency: invoices.currency,
        subtotal_amount: invoices.subtotal_amount,
        discount_amount: invoices.discount_amount,
        tax_amount: invoices.tax_amount,
        total_amount: invoices.total_amount,
        payment_method: invoices.payment_method,
        credit_due_date: invoices.credit_due_date,
        invoice_number: invoices.invoice_number,
        notes: invoices.notes,
        created_at: invoices.created_at,
        voided_at: invoices.voided_at,
        client_name: clients.name,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.client_id, clients.id))
      .where(
        and(eq(invoices.id, id), eq(invoices.company_id, companyId)),
      )
      .limit(1);

    if (!inv) {
      return jsonErr("Factura no encontrada", 404);
    }

    const [co] = await db
      .select({
        name: companies.name,
        tax_id: companies.tax_id,
        auth_code: companies.auth_code,
        range_start: companies.range_start,
        range_end: companies.range_end,
        expiration_date: companies.expiration_date,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    const lines = await db
      .select({
        line_number: invoiceLines.line_number,
        product_id: invoiceLines.product_id,
        product_name: invoiceLines.product_name,
        sku: invoiceLines.sku,
        quantity: invoiceLines.quantity,
        unit_price: invoiceLines.unit_price,
        line_total: invoiceLines.line_total,
      })
      .from(invoiceLines)
      .where(eq(invoiceLines.invoice_id, id))
      .orderBy(asc(invoiceLines.line_number));

    const pids = [
      ...new Set(
        lines.map((l) => l.product_id).filter((x): x is string => Boolean(x)),
      ),
    ];
    const imageByProduct = new Map<string, string>();
    if (pids.length > 0) {
      const imgs = await db
        .select({
          product_id: productImages.product_id,
          url: productImages.url,
          sort_order: productImages.sort_order,
        })
        .from(productImages)
        .where(inArray(productImages.product_id, pids))
        .orderBy(asc(productImages.sort_order), asc(productImages.product_id));

      for (const im of imgs) {
        if (!imageByProduct.has(im.product_id)) {
          imageByProduct.set(im.product_id, im.url);
        }
      }
    }

    const linesOut = lines.map((l) => ({
      line_number: l.line_number,
      product_id: l.product_id,
      product_name: l.product_name,
      sku: l.sku,
      quantity: String(l.quantity),
      unit_price: String(l.unit_price),
      line_total: String(l.line_total),
      image_url: l.product_id
        ? (imageByProduct.get(l.product_id) ?? null)
        : null,
    }));

    return jsonOk({
      invoice: {
        id: inv.id,
        client_id: inv.client_id,
        client_name: inv.client_name,
        sale_date: inv.sale_date,
        status: inv.status,
        currency: inv.currency,
        subtotal_amount: String(inv.subtotal_amount),
        discount_amount: String(inv.discount_amount),
        tax_amount: String(inv.tax_amount),
        total_amount: String(inv.total_amount),
        payment_method: inv.payment_method,
        credit_due_date: inv.credit_due_date,
        invoice_number: inv.invoice_number,
        notes: inv.notes,
        created_at: inv.created_at.toISOString(),
        voided_at: inv.voided_at ? inv.voided_at.toISOString() : null,
      },
      company: co
        ? {
            name: co.name,
            tax_id: co.tax_id,
            auth_code: co.auth_code,
            range_start: co.range_start,
            range_end: co.range_end,
            expiration_date: co.expiration_date
              ? String(co.expiration_date)
              : null,
          }
        : null,
      lines: linesOut,
    });
  } catch (e) {
    console.error("[GET /api/invoices/[id]]", e);
    return jsonErr("Error al cargar la factura", 500);
  }
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const gate = await requireSession();
  if (gate.error) {
    return gate.error;
  }
  const companyId = gate.session.company.id;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErr("Cuerpo JSON inválido", 400);
  }

  const parsed = patchInvoiceBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonErr(first?.message ?? "Datos inválidos", 400);
  }

  const d = parsed.data;
  if (Object.keys(d).length === 0) {
    return jsonErr("Nada que actualizar", 400);
  }

  try {
    const db = getDb();

    const [cur] = await db
      .select({ voided_at: invoices.voided_at })
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.company_id, companyId)))
      .limit(1);

    if (!cur) {
      return jsonErr("Factura no encontrada", 404);
    }
    if (cur.voided_at) {
      return jsonErr("No se puede editar una factura anulada", 400);
    }

    const toSet: {
      updated_at: Date;
      notes?: string | null;
      invoice_number?: string | null;
    } = { updated_at: new Date() };
    if ("notes" in d) {
      toSet.notes = d.notes ?? null;
    }
    if ("invoice_number" in d) {
      toSet.invoice_number = d.invoice_number?.trim() || null;
    }

    await db.update(invoices).set(toSet).where(eq(invoices.id, id));

    return jsonOk({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/invoices/[id]]", e);
    return jsonErr("Error al guardar", 500);
  }
}
