import { z } from "zod";

export const updateProductStockBodySchema = z.object({
  stock_quantity: z.coerce.number().int().min(0),
});

export type UpdateProductStockBody = z.infer<typeof updateProductStockBodySchema>;
