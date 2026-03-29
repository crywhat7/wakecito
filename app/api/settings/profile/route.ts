import { eq } from "drizzle-orm";

import { users } from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { createSessionFromClaims } from "@/lib/auth/session-cookie";
import { getSessionFromCookies } from "@/lib/auth/session";
import { profileNamePatchSchema } from "@/lib/validators/settings";

export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return jsonErr("No autorizado", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErr("Cuerpo JSON inválido", 400);
  }

  const parsed = profileNamePatchSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonErr(first?.message ?? "Datos inválidos", 400);
  }

  const { name } = parsed.data;

  try {
    const db = getDb();

    await db
      .update(users)
      .set({
        name,
        updated_at: new Date(),
      })
      .where(eq(users.id, session.user.id));

    await createSessionFromClaims({
      sub: session.user.id,
      email: session.user.email,
      name,
      companyId: session.company.id,
      companyName: session.company.name,
      role: session.role,
    });

    return jsonOk({ user: { name } });
  } catch (e) {
    console.error("[PATCH /api/settings/profile]", e);
    return jsonErr("Error al guardar el perfil", 500);
  }
}
