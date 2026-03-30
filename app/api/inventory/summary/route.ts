import {
  and,
  asc,
  count,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";

import {
  invoiceLines,
  invoices,
  productCategories,
  productImages,
  products,
  unitsOfMeasure,
} from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/require-session";

/** Stock bajo: mayor a 0 y hasta este umbral (inclusive). */
export const LOW_STOCK_THRESHOLD = 10;

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

  const companyId = gate.session.company.id;
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const categoryId = url.searchParams.get("category_id")?.trim() || null;
  const page = parseIntParam(url.searchParams.get("page"), 1, 1, 10_000);
  const pageSize = parseIntParam(url.searchParams.get("page_size"), 50, 1, 200);
  const year = parseIntParam(
    url.searchParams.get("year"),
    new Date().getFullYear(),
    2000,
    2100,
  );

  const offset = (page - 1) * pageSize;

  try {
    const db = getDb();

    const [aggRow] = await db
      .select({
        total_products: sql<number>`count(*)::int`,
        out_of_stock: sql<number>`count(*) filter (where ${products.stock_quantity} = 0)::int`,
        low_stock: sql<number>`count(*) filter (where ${products.stock_quantity} > 0 and ${products.stock_quantity} <= ${sql.raw(String(LOW_STOCK_THRESHOLD))})::int`,
        inventory_value: sql<string>`coalesce(sum(${products.price}::numeric * ${products.stock_quantity}), 0)::text`,
      })
      .from(products)
      .where(and(eq(products.company_id, companyId), eq(products.is_active, true)));

    const [catCountRow] = await db
      .select({ n: count() })
      .from(productCategories)
      .where(
        and(
          eq(productCategories.company_id, companyId),
          eq(productCategories.is_active, true),
        ),
      );

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const [soldRow] = await db
      .select({
        total: sql<string>`coalesce(sum(${invoiceLines.line_total}), 0)::text`,
      })
      .from(invoiceLines)
      .innerJoin(invoices, eq(invoiceLines.invoice_id, invoices.id))
      .where(
        and(
          eq(invoices.company_id, companyId),
          isNull(invoices.voided_at),
          gte(invoices.sale_date, yearStart),
          lte(invoices.sale_date, yearEnd),
        ),
      );

    const categoryRows = await db
      .select({
        id: productCategories.id,
        name: productCategories.name,
        sort_order: productCategories.sort_order,
      })
      .from(productCategories)
      .where(
        and(
          eq(productCategories.company_id, companyId),
          eq(productCategories.is_active, true),
        ),
      )
      .orderBy(asc(productCategories.sort_order), asc(productCategories.name));

    const listConditions = [
      eq(products.company_id, companyId),
      eq(products.is_active, true),
    ];

    if (categoryId) {
      listConditions.push(eq(products.category_id, categoryId));
    }

    if (q.length > 0) {
      const term = `%${q}%`;
      const searchCond = or(
        ilike(products.name, term),
        ilike(products.sku, term),
      );
      if (searchCond) {
        listConditions.push(searchCond);
      }
    }

    const listWhere = and(...listConditions);

    const [countRow] = await db
      .select({ n: count() })
      .from(products)
      .where(listWhere);

    const totalFiltered = Number(countRow?.n ?? 0);

    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        stock_quantity: products.stock_quantity,
        price: products.price,
        currency: products.currency,
        category_id: products.category_id,
        category_name: productCategories.name,
        unit_code: unitsOfMeasure.code,
        unit_name: unitsOfMeasure.name,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.category_id, productCategories.id))
      .leftJoin(unitsOfMeasure, eq(products.unit_id, unitsOfMeasure.id))
      .where(listWhere)
      .orderBy(asc(products.name))
      .limit(pageSize)
      .offset(offset);

    const ids = productRows.map((r) => r.id);
    const imageByProduct = new Map<string, string>();

    if (ids.length > 0) {
      const imgs = await db
        .select({
          product_id: productImages.product_id,
          url: productImages.url,
          sort_order: productImages.sort_order,
        })
        .from(productImages)
        .where(inArray(productImages.product_id, ids))
        .orderBy(asc(productImages.sort_order));

      for (const row of imgs) {
        if (!imageByProduct.has(row.product_id)) {
          imageByProduct.set(row.product_id, row.url);
        }
      }
    }

    const list = productRows.map((p) => ({
      ...p,
      price: String(p.price),
      sku: p.sku,
      category_name: p.category_name,
      unit_code: p.unit_code,
      unit_name: p.unit_name,
      image_url: imageByProduct.get(p.id) ?? null,
    }));

    return jsonOk({
      stats: {
        total_products: aggRow?.total_products ?? 0,
        categories_count: Number(catCountRow?.n ?? 0),
        low_stock_count: aggRow?.low_stock ?? 0,
        out_of_stock_count: aggRow?.out_of_stock ?? 0,
        inventory_value: aggRow?.inventory_value ?? "0",
        sold_amount_year: soldRow?.total ?? "0",
        year,
        low_stock_threshold: LOW_STOCK_THRESHOLD,
      },
      categories: categoryRows,
      products: list,
      pagination: {
        page,
        page_size: pageSize,
        total: totalFiltered,
      },
    });
  } catch (e) {
    console.error("[GET /api/inventory/summary]", e);
    return jsonErr("Error al cargar el resumen de inventario", 500);
  }
}
