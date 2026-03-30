import { z } from "zod";

const dateStr = z
  .string()
  .trim()
  .refine((s) => s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s), {
    message: "Fecha inválida (usá AAAA-MM-DD)",
  });

export const companySettingsPatchSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  tax_id: z.string().trim().max(50),
  auth_code: z.string().trim().max(100),
  range_start: z.string().trim().max(100),
  range_end: z.string().trim().max(100),
  expiration_date: dateStr,
  /** Siguiente correlativo a emitir (1…99999999). */
  invoice_next_number: z.coerce.number().int().min(1).max(99_999_999).optional(),
});

export type CompanySettingsPatchInput = z.infer<
  typeof companySettingsPatchSchema
>;

export const profileNamePatchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(120, "Nombre demasiado largo"),
});

export type ProfileNamePatchInput = z.infer<typeof profileNamePatchSchema>;
