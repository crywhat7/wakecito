import { jsonErr } from "@/lib/api/response";
import { getSessionFromCookies } from "@/lib/auth/session";
import type { PublicSession } from "@/lib/auth/session";

/** Sesión requerida (cualquier rol con empresa). */
export async function requireSession(): Promise<
  | { session: PublicSession; error: null }
  | { session: null; error: ReturnType<typeof jsonErr> }
> {
  const session = await getSessionFromCookies();
  if (!session) {
    return { session: null, error: jsonErr("No autorizado", 401) };
  }
  return { session, error: null };
}
