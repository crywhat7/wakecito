import { z } from "zod";

export const patchInvoiceBodySchema = z.object({
  notes: z.string().max(4000).nullable().optional(),
  invoice_number: z.string().max(120).nullable().optional(),
});

export type PatchInvoiceBodyInput = z.infer<typeof patchInvoiceBodySchema>;
