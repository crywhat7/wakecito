import { jsonErr } from "@/lib/api/response";
import { getSessionFromCookies } from "@/lib/auth/session";
import type { PublicSession } from "@/lib/auth/session";

export async function requireCrudAdmin(): Promise<
  | { session: PublicSession; error: null }
  | { session: null; error: ReturnType<typeof jsonErr> }
> {
  const session = await getSessionFromCookies();
  if (!session) {
    return { session: null, error: jsonErr("No autorizado", 401) };
  }
  if (session.role !== "admin") {
    return {
      session: null,
      error: jsonErr("Solo administradores pueden usar el explorador CRUD", 403),
    };
  }
  return { session, error: null };
}
