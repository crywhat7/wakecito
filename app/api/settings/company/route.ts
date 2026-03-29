import { eq } from "drizzle-orm";

import { companies } from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { createSessionFromClaims } from "@/lib/auth/session-cookie";
import { getSessionFromCookies } from "@/lib/auth/session";
import { companySettingsPatchSchema } from "@/lib/validators/settings";

function toNullIfEmpty(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}

export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return jsonErr("No autorizado", 401);
  }
  if (session.role !== "admin") {
    return jsonErr("Solo un administrador puede editar los datos de la empresa", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErr("Cuerpo JSON inválido", 400);
  }

  const parsed = companySettingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonErr(first?.message ?? "Datos inválidos", 400);
  }

  const d = parsed.data;

  try {
    const db = getDb();

    await db
      .update(companies)
      .set({
        name: d.name,
        tax_id: toNullIfEmpty(d.tax_id),
        auth_code: toNullIfEmpty(d.auth_code),
        range_start: toNullIfEmpty(d.range_start),
        range_end: toNullIfEmpty(d.range_end),
        expiration_date: d.expiration_date.trim()
          ? d.expiration_date.trim()
          : null,
        updated_at: new Date(),
      })
      .where(eq(companies.id, session.company.id));

    await createSessionFromClaims({
      sub: session.user.id,
      email: session.user.email,
      name: session.user.name,
      companyId: session.company.id,
      companyName: d.name,
      role: session.role,
    });

    return jsonOk({
      company: {
        name: d.name,
        tax_id: toNullIfEmpty(d.tax_id),
        auth_code: toNullIfEmpty(d.auth_code),
        range_start: toNullIfEmpty(d.range_start),
        range_end: toNullIfEmpty(d.range_end),
        expiration_date: d.expiration_date.trim() || null,
      },
    });
  } catch (e) {
    console.error("[PATCH /api/settings/company]", e);
    return jsonErr("Error al guardar la empresa", 500);
  }
}
