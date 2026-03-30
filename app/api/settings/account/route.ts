import { eq } from "drizzle-orm";

import { companies, users } from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { getSessionFromCookies } from "@/lib/auth/session";

/** GET — datos de empresa (sesión) y usuario para pantalla de configuración. */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return jsonErr("No autorizado", 401);
  }

  try {
    const db = getDb();

    const companyRows = await db
      .select({
        id: companies.id,
        name: companies.name,
        tax_id: companies.tax_id,
        auth_code: companies.auth_code,
        range_start: companies.range_start,
        range_end: companies.range_end,
        expiration_date: companies.expiration_date,
        invoice_next_number: companies.invoice_next_number,
      })
      .from(companies)
      .where(eq(companies.id, session.company.id))
      .limit(1);

    const company = companyRows[0];
    if (!company) {
      return jsonErr("Empresa no encontrada", 404);
    }

    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const user = userRows[0];
    if (!user) {
      return jsonErr("Usuario no encontrado", 404);
    }

    return jsonOk({
      company: {
        ...company,
        expiration_date: company.expiration_date
          ? String(company.expiration_date)
          : "",
      },
      user,
      canEditCompany: session.role === "admin",
    });
  } catch (e) {
    console.error("[GET /api/settings/account]", e);
    return jsonErr("Error al cargar la configuración", 500);
  }
}
