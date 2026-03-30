import { and, asc, eq } from "drizzle-orm";

import {
  productCategories,
  productImages,
  products,
  productVariantValues,
  unitsOfMeasure,
} from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/require-session";
import { createProductBodySchema } from "@/lib/validators/products";

function emptyToNull(s: string | null | undefined): string | null {
  if (s === undefined || s === null) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function numToForm(n: string | number | null | undefined): string {
  if (n === undefined || n === null) return "";
  return String(n);
}

export async function GET(
  _request: Request,
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

  try {
    const db = getDb();
    const companyId = gate.session.company.id;

    const [row] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.company_id, companyId)))
      .limit(1);

    if (!row) {
      return jsonErr("Producto no encontrado", 404);
    }

    const [imgRows, variantRows] = await Promise.all([
      db
        .select({
          url: productImages.url,
          sort_order: productImages.sort_order,
        })
        .from(productImages)
        .where(eq(productImages.product_id, id))
        .orderBy(asc(productImages.sort_order)),
      db
        .select({
          name: productVariantValues.name,
          sort_order: productVariantValues.sort_order,
        })
        .from(productVariantValues)
        .where(eq(productVariantValues.product_id, id))
        .orderBy(asc(productVariantValues.sort_order)),
    ]);

    const images = imgRows.map((r) => r.url);
    const variant_names = variantRows.map((r) => r.name);

    return jsonOk({
      product: {
        id: row.id,
        sku: row.sku,
        barcode: row.barcode,
        name: row.name,
        category_id: row.category_id,
        unit_id: row.unit_id,
        description: row.description,
        price: numToForm(row.price),
        cost_price: row.cost_price != null ? numToForm(row.cost_price) : null,
        currency: row.currency,
        tax_rate: row.tax_rate != null ? numToForm(row.tax_rate) : null,
        stock_quantity: row.stock_quantity,
        show_in_web_catalog: row.show_in_web_catalog,
        has_variants: row.has_variants,
        variant_type_label: row.variant_type_label,
        product_condition: row.product_condition,
        shipping_insurance: row.shipping_insurance,
        internal_notes: row.internal_notes,
        images,
        variant_names,
      },
    });
  } catch (e) {
    console.error("[GET /api/products/[id]]", e);
    return jsonErr("Error al cargar el producto", 500);
  }
}

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

  const parsed = createProductBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonErr(first?.message ?? "Datos inválidos", 400);
  }

  const d = parsed.data;
  const skuNorm = emptyToNull(d.sku ?? undefined);
  const imageUrls = (d.images ?? [])
    .map((u) => u.trim())
    .filter((u) => u.length > 0)
    .slice(0, 3);

  const variantNames = d.has_variants
    ? [...new Set((d.variant_names ?? []).map((n) => n.trim()).filter(Boolean))]
    : [];

  try {
    const db = getDb();
    const companyId = gate.session.company.id;

    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), eq(products.company_id, companyId)))
      .limit(1);

    if (!existing) {
      return jsonErr("Producto no encontrado", 404);
    }

    if (d.category_id) {
      const [cat] = await db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.id, d.category_id),
            eq(productCategories.company_id, companyId),
          ),
        )
        .limit(1);
      if (!cat) {
        return jsonErr("La categoría no existe o no es de tu empresa", 400);
      }
    }

    if (d.unit_id) {
      const [u] = await db
        .select({ id: unitsOfMeasure.id })
        .from(unitsOfMeasure)
        .where(
          and(eq(unitsOfMeasure.id, d.unit_id), eq(unitsOfMeasure.is_active, true)),
        )
        .limit(1);
      if (!u) {
        return jsonErr("Unidad de medida inválida", 400);
      }
    }

    const priceStr = d.price.trim();
    const costStr = d.cost_price?.trim() ?? null;
    const taxStr = d.tax_rate?.trim() ?? null;

    const result = await db.transaction(async (tx) => {
      const [product] = await tx
        .update(products)
        .set({
          sku: skuNorm,
          barcode: emptyToNull(d.barcode ?? undefined),
          name: d.name.trim(),
          category_id: d.category_id ?? null,
          unit_id: d.unit_id ?? null,
          description: emptyToNull(d.description ?? undefined),
          price: priceStr,
          cost_price: costStr,
          currency: d.currency.trim() || "HNL",
          tax_rate: taxStr,
          stock_quantity: d.stock_quantity,
          show_in_web_catalog: d.show_in_web_catalog,
          has_variants: d.has_variants,
          variant_type_label: d.has_variants
            ? d.variant_type_label?.trim() ?? null
            : null,
          product_condition: d.product_condition,
          shipping_insurance: d.shipping_insurance,
          internal_notes: emptyToNull(d.internal_notes ?? undefined),
          updated_at: new Date(),
        })
        .where(and(eq(products.id, id), eq(products.company_id, companyId)))
        .returning({
          id: products.id,
          name: products.name,
          sku: products.sku,
        });

      if (!product) {
        throw new Error("update product");
      }

      await tx.delete(productImages).where(eq(productImages.product_id, id));
      await tx
        .delete(productVariantValues)
        .where(eq(productVariantValues.product_id, id));

      for (let i = 0; i < imageUrls.length; i++) {
        await tx.insert(productImages).values({
          product_id: id,
          url: imageUrls[i],
          sort_order: i + 1,
        });
      }

      if (d.has_variants && variantNames.length > 0) {
        await tx.insert(productVariantValues).values(
          variantNames.map((name, i) => ({
            product_id: id,
            name,
            sort_order: i,
          })),
        );
      }

      return product;
    });

    return jsonOk({
      product: {
        id: result.id,
        name: result.name,
        sku: result.sku,
        images_count: imageUrls.length,
        variants_count: variantNames.length,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return jsonErr("Ya existe un producto con ese SKU en tu empresa", 409);
    }
    console.error("[PATCH /api/products/[id]]", e);
    return jsonErr("Error al actualizar el producto", 500);
  }
}
