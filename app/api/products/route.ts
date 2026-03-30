import { and, eq } from "drizzle-orm";

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

    if (d.category_id) {
      const [cat] = await db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.id, d.category_id),
            eq(productCategories.company_id, gate.session.company.id),
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
        .insert(products)
        .values({
          company_id: gate.session.company.id,
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
        })
        .returning({
          id: products.id,
          name: products.name,
          sku: products.sku,
        });

      if (!product) {
        throw new Error("insert product");
      }

      for (let i = 0; i < imageUrls.length; i++) {
        await tx.insert(productImages).values({
          product_id: product.id,
          url: imageUrls[i],
          sort_order: i + 1,
        });
      }

      if (d.has_variants && variantNames.length > 0) {
        await tx.insert(productVariantValues).values(
          variantNames.map((name, i) => ({
            product_id: product.id,
            name,
            sort_order: i,
          })),
        );
      }

      return product;
    });

    return jsonOk(
      {
        product: {
          id: result.id,
          name: result.name,
          sku: result.sku,
          images_count: imageUrls.length,
          variants_count: variantNames.length,
        },
      },
      201,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return jsonErr("Ya existe un producto con ese SKU en tu empresa", 409);
    }
    console.error("[POST /api/products]", e);
    return jsonErr("Error al crear el producto", 500);
  }
}
