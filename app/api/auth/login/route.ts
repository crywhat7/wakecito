import { asc, eq } from "drizzle-orm";

import { companies, memberships, users } from "@/app/db/schema";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { createSessionFromClaims } from "@/lib/auth/session-cookie";
import { verifyPassword } from "@/lib/auth/password";
import { loginBodySchema } from "@/lib/validators/auth";
import { getDb } from "@/db";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErr("Cuerpo JSON inválido", 400);
  }

  const parsed = loginBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonErr(first?.message ?? "Datos inválidos", 400);
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const db = getDb();

    const rows = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        password_hash: users.password_hash,
        companyId: companies.id,
        companyName: companies.name,
        role: memberships.role,
      })
      .from(users)
      .innerJoin(memberships, eq(memberships.user_id, users.id))
      .innerJoin(companies, eq(companies.id, memberships.company_id))
      .where(eq(users.email, normalizedEmail))
      .orderBy(asc(memberships.created_at))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return jsonErr("Correo o contraseña incorrectos", 401);
    }

    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) {
      return jsonErr("Correo o contraseña incorrectos", 401);
    }

    await createSessionFromClaims({
      sub: row.userId,
      email: row.email,
      name: row.name,
      companyId: row.companyId,
      companyName: row.companyName,
      role: row.role,
    });

    return jsonOk({
      user: {
        id: row.userId,
        email: row.email,
        name: row.name,
      },
      company: {
        id: row.companyId,
        name: row.companyName,
      },
      role: row.role,
    });
  } catch (e) {
    console.error("[POST /api/auth/login]", e);
    return jsonErr("Error al iniciar sesión", 500);
  }
}
