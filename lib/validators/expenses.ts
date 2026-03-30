import { z } from "zod";

export const createExpenseCategoryBodySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
});

export type CreateExpenseCategoryBody = z.infer<
  typeof createExpenseCategoryBodySchema
>;

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usá formato AAAA-MM-DD");

const expenseLineSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1"),
  unit_cost: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v === undefined || v === null ? null : String(v))),
});

export const createExpenseBodySchema = z
  .object({
    category_id: z.string().uuid(),
    expense_date: isoDate,
    total_amount: z.union([z.string(), z.number()]).transform((v) => String(v)),
    currency: z.string().trim().max(8).default("HNL"),
    payment_type: z.enum(["cash", "credit"]),
    expected_payment_date: isoDate.optional().nullable(),
    description: z.string().trim().max(5000).optional().nullable(),
    reference: z.string().trim().max(120).optional().nullable(),
    payee_name: z.string().trim().max(200).optional().nullable(),
    lines: z.array(expenseLineSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.payment_type === "credit") {
      if (!data.expected_payment_date) {
        ctx.addIssue({
          code: "custom",
          message:
            "La fecha de pago estimada es obligatoria para gastos a crédito",
          path: ["expected_payment_date"],
        });
      }
    }
    if (data.payment_type === "cash" && data.expected_payment_date) {
      ctx.addIssue({
        code: "custom",
        message: "En gastos al contado no debe indicarse fecha de pago",
        path: ["expected_payment_date"],
      });
    }

    const seen = new Set<string>();
    for (let i = 0; i < data.lines.length; i++) {
      const pid = data.lines[i].product_id;
      if (seen.has(pid)) {
        ctx.addIssue({
          code: "custom",
          message: "No repetir el mismo producto en varias líneas",
          path: ["lines", i, "product_id"],
        });
        break;
      }
      seen.add(pid);
    }
  });

export type CreateExpenseBody = z.infer<typeof createExpenseBodySchema>;
