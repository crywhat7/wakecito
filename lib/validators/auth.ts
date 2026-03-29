import { z } from "zod";

export const loginBodySchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const registerBodySchema = z
  .object({
    email: z.string().email("Email inválido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(72, "Contraseña demasiado larga"),
    name: z.string().min(2, "El nombre es obligatorio").max(120),
    companyName: z
      .string()
      .min(2, "El nombre del negocio es obligatorio")
      .max(120),
  })
  .strict();
