import { z } from "zod";

export const createInvoiceBodySchema = z
  .object({
    sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
    status: z.enum(["paid", "credit"]),
    client_id: z.string().uuid().nullable().optional(),
    discount_amount: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === "number" ? String(v) : v))
      .optional()
      .default("0"),
    payment_method: z.enum(["cash", "card", "transfer", "other"]).nullable().optional(),
    /** Solo ventas a crédito: fecha tentativa de cobro. */
    credit_due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)")
      .nullable()
      .optional(),
    lines: z
      .array(
        z.object({
          product_id: z.string().uuid(),
          quantity: z.coerce.number().int().min(1),
        }),
      )
      .min(1, "Agregá al menos un producto"),
  })
  .superRefine((data, ctx) => {
    if (data.status === "paid" && !data.payment_method) {
      ctx.addIssue({
        code: "custom",
        message: "Seleccioná un método de pago",
        path: ["payment_method"],
      });
    }
    if (data.status === "credit" && !data.credit_due_date) {
      ctx.addIssue({
        code: "custom",
        message: "Indicá la fecha tentativa de pago",
        path: ["credit_due_date"],
      });
    }
    if (
      data.status === "credit" &&
      data.credit_due_date &&
      data.credit_due_date < data.sale_date
    ) {
      ctx.addIssue({
        code: "custom",
        message: "La fecha tentativa no puede ser anterior a la venta",
        path: ["credit_due_date"],
      });
    }
    const disc = Number.parseFloat(data.discount_amount || "0");
    if (Number.isNaN(disc) || disc < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Descuento inválido",
        path: ["discount_amount"],
      });
    }
  });

export type CreateInvoiceBodyInput = z.infer<typeof createInvoiceBodySchema>;
