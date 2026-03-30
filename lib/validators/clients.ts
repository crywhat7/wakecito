import { z } from "zod";

export const createClientBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "El nombre es demasiado largo"),
  rtn: z
    .string()
    .trim()
    .max(32, "El RTN es demasiado largo")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type CreateClientBodyInput = z.infer<typeof createClientBodySchema>;
