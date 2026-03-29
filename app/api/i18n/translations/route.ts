import { eq } from "drizzle-orm";

import { translations } from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { getSessionFromCookies } from "@/lib/auth/session";

/**
 * GET ?locale=es
 * Devuelve mapas planos para etiquetas de columnas (`table.column`) y títulos de tablas.
 */
export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return jsonErr("No autorizado", 401);
  }

  const locale =
    new URL(request.url).searchParams.get("locale")?.trim() || "es";

  try {
    const db = getDb();
    const rows = await db
      .select({
        namespace: translations.namespace,
        key: translations.key,
        value: translations.value,
      })
      .from(translations)
      .where(eq(translations.locale, locale));

    const byColumn: Record<string, string> = {};
    const byTableTitle: Record<string, string> = {};
    const byUi: Record<string, string> = {};

    for (const r of rows) {
      if (r.namespace === "column") {
        byColumn[r.key] = r.value;
      } else if (r.namespace === "table") {
        byTableTitle[r.key] = r.value;
      } else if (r.namespace === "ui") {
        byUi[r.key] = r.value;
      }
    }

    return jsonOk({ locale, byColumn, byTableTitle, byUi });
  } catch (e) {
    console.error("[GET /api/i18n/translations]", e);
    return jsonErr("Error al cargar traducciones", 500);
  }
}
