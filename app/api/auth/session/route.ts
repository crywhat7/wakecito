import { jsonErr, jsonOk } from "@/lib/api/response";
import { getSessionFromCookies } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return jsonErr("No hay sesión activa", 401);
    }
    return jsonOk(session);
  } catch (e) {
    console.error("[GET /api/auth/session]", e);
    return jsonErr("No se pudo leer la sesión", 500);
  }
}
