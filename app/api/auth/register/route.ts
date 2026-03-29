import { companies, memberships, users } from "@/app/db/schema";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { createSessionFromClaims } from "@/lib/auth/session-cookie";
import { hashPassword } from "@/lib/auth/password";
import { getOrCreateFreePlanId } from "@/lib/db/free-plan";
import { registerBodySchema } from "@/lib/validators/auth";
import { getDb } from "@/db";

function isUniqueViolation(e: unknown): boolean {
  if (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "23505"
  ) {
    return true;
  }
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("23505") || msg.toLowerCase().includes("unique");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErr("Cuerpo JSON inválido", 400);
  }

  const parsed = registerBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonErr(first?.message ?? "Datos inválidos", 400);
  }

  const { email, password, name, companyName } = parsed.data;

  try {
    const password_hash = await hashPassword(password);
    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const planId = await getOrCreateFreePlanId(tx);

      const [user] = await tx
        .insert(users)
        .values({
          email: email.toLowerCase().trim(),
          password_hash,
          name: name.trim(),
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          created_at: users.created_at,
        });

      if (!user) {
        throw new Error("No se pudo crear el usuario");
      }

      const [company] = await tx
        .insert(companies)
        .values({
          name: companyName.trim(),
          plan_id: planId,
        })
        .returning({
          id: companies.id,
          name: companies.name,
        });

      if (!company) {
        throw new Error("No se pudo crear la empresa");
      }

      await tx.insert(memberships).values({
        user_id: user.id,
        company_id: company.id,
        role: "admin",
      });

      return { user, company };
    });

    await createSessionFromClaims({
      sub: result.user.id,
      email: result.user.email,
      name: result.user.name,
      companyId: result.company.id,
      companyName: result.company.name,
      role: "admin",
    });

    return jsonOk({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        created_at: result.user.created_at,
      },
      company: result.company,
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return jsonErr("Ya existe una cuenta con ese correo", 409);
    }
    console.error("[POST /api/auth/register]", e);
    return jsonErr("No se pudo completar el registro", 500);
  }
}
