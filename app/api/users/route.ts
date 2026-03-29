import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { users } from "@/app/db/schema";
import { getDb } from "@/db";

const querySchema = z
  .object({
    id: z.string().uuid().optional(),
    email: z.string().email().optional(),
  })
  .refine((q) => Boolean(q.id) !== Boolean(q.email), {
    message: "Enviá exactamente uno de los parámetros: id o email",
  });

/** GET /api/users?id=<uuid> | GET /api/users?email=<correo> — no devuelve password_hash. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = {
    id: searchParams.get("id") ?? undefined,
    email: searchParams.get("email") ?? undefined,
  };

  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Parámetros inválidos",
        details: z.treeifyError(parsed.error),
      },
      { status: 400 },
    );
  }

  const { id, email } = parsed.data;

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .where(id ? eq(users.id, id) : eq(users.email, email!))
      .limit(1);

    const user = rows[0];
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error("[GET /api/users]", e);
    return NextResponse.json(
      { error: "Error al consultar la base de datos" },
      { status: 500 },
    );
  }
}
