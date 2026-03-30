import { z } from "zod";

const conditionEnum = z.enum(["new", "pre_order", "post_exhibit", "used"]);
const insuranceEnum = z.enum(["required", "optional", "none"]);

export const createProductBodySchema = z
  .object({
    sku: z.string().trim().max(80).optional().nullable(),
    barcode: z.string().trim().max(80).optional().nullable(),
    name: z.string().trim().min(1, "El nombre es obligatorio").max(300),
    category_id: z.string().uuid().optional().nullable(),
    unit_id: z.string().uuid().optional().nullable(),
    description: z.string().trim().max(20000).optional().nullable(),
    price: z.union([z.string(), z.number()]).transform((v) => String(v)),
    cost_price: z
      .union([z.string(), z.number()])
      .optional()
      .nullable()
      .transform((v) => (v === undefined || v === null ? null : String(v))),
    currency: z.string().trim().max(8).default("HNL"),
    tax_rate: z
      .union([z.string(), z.number()])
      .optional()
      .nullable()
      .transform((v) => (v === undefined || v === null ? null : String(v))),
    stock_quantity: z.coerce.number().int().min(0).default(0),
    show_in_web_catalog: z.boolean().default(true),
    has_variants: z.boolean().default(false),
    variant_type_label: z.string().trim().max(80).optional().nullable(),
    variant_names: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
    product_condition: conditionEnum.default("new"),
    shipping_insurance: insuranceEnum.default("optional"),
    internal_notes: z.string().trim().max(5000).optional().nullable(),
    images: z
      .array(z.string().trim().max(2000))
      .max(3)
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (data.has_variants) {
      if (!data.variant_type_label?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Indicá el tipo de variante (ej. Color)",
          path: ["variant_type_label"],
        });
      }
      const names = data.variant_names ?? [];
      if (names.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Agregá al menos un valor de variante",
          path: ["variant_names"],
        });
      }
    }
  });

export type CreateProductBodyInput = z.infer<typeof createProductBodySchema>;

export const createProductCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
});
