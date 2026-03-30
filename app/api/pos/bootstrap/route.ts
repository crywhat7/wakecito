import { and, asc, eq, inArray } from "drizzle-orm";

import {
  clients,
  productCategories,
  productImages,
  products,
} from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/require-session";

export async function GET() {
  const gate = await requireSession();
  if (gate.error) {
    return gate.error;
  }
  const companyId = gate.session.company.id;

  try {
    const db = getDb();

    const [categoryRows, productRows, clientRows] = await Promise.all([
      db
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
        .orderBy(asc(productCategories.sort_order), asc(productCategories.name)),
      db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          price: products.price,
          cost_price: products.cost_price,
          currency: products.currency,
          stock_quantity: products.stock_quantity,
          category_id: products.category_id,
        })
        .from(products)
        .where(
          and(eq(products.company_id, companyId), eq(products.is_active, true)),
        )
        .orderBy(asc(products.name)),
      db
        .select({
          id: clients.id,
          name: clients.name,
        })
        .from(clients)
        .where(
          and(eq(clients.company_id, companyId), eq(clients.is_active, true)),
        )
        .orderBy(asc(clients.name)),
    ]);

    const productIds = productRows.map((p) => p.id);
    const imageByProduct = new Map<string, string>();

    if (productIds.length > 0) {
      const imgs = await db
        .select({
          product_id: productImages.product_id,
          url: productImages.url,
          sort_order: productImages.sort_order,
        })
        .from(productImages)
        .where(inArray(productImages.product_id, productIds))
        .orderBy(asc(productImages.sort_order));

      for (const row of imgs) {
        if (!imageByProduct.has(row.product_id)) {
          imageByProduct.set(row.product_id, row.url);
        }
      }
    }

    const catalogProducts = productRows.map((p) => ({
      ...p,
      price: String(p.price),
      cost_price:
        p.cost_price != null && String(p.cost_price).trim() !== ""
          ? String(p.cost_price)
          : null,
      image_url: imageByProduct.get(p.id) ?? null,
    }));

    return jsonOk({
      categories: categoryRows,
      products: catalogProducts,
      clients: clientRows,
    });
  } catch (e) {
    console.error("[GET /api/pos/bootstrap]", e);
    return jsonErr("Error al cargar el punto de venta", 500);
  }
}
