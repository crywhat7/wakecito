import { and, asc, eq } from "drizzle-orm";

import { companies, features, plan_features, plans } from "@/app/db/schema";
import { getDb } from "@/db";
import { jsonErr, jsonOk } from "@/lib/api/response";
import { getSessionFromCookies } from "@/lib/auth/session";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return jsonErr("No autorizado", 401);
  }

  try {
    const db = getDb();

    const [company, planRows, featureRows] = await Promise.all([
      db
        .select({ plan_id: companies.plan_id })
        .from(companies)
        .where(eq(companies.id, session.company.id))
        .limit(1),
      db
        .select({
          id: plans.id,
          name: plans.name,
          description: plans.description,
          price: plans.price,
          currency: plans.currency,
          sort_order: plans.sort_order,
        })
        .from(plans)
        .where(eq(plans.is_active, true))
        .orderBy(asc(plans.sort_order), asc(plans.price)),
      db
        .select({
          id: features.id,
          name: features.name,
          sort_order: features.sort_order,
        })
        .from(features)
        .orderBy(asc(features.sort_order), asc(features.name)),
    ]);

    const currentPlanId = company[0]?.plan_id ?? null;
    if (!currentPlanId) {
      return jsonErr("No se encontró el plan actual de la empresa", 404);
    }

    const planIds = new Set(planRows.map((p) => p.id));
    const assignmentRows =
      planIds.size === 0
        ? []
        : await db
            .select({
              plan_id: plan_features.plan_id,
              feature_id: plan_features.feature_id,
            })
            .from(plan_features);
    const byPlan = new Map<string, string[]>();
    for (const row of assignmentRows) {
      if (!planIds.has(row.plan_id)) continue;
      const prev = byPlan.get(row.plan_id) ?? [];
      prev.push(row.feature_id);
      byPlan.set(row.plan_id, prev);
    }

    return jsonOk({
      currentPlanId,
      plans: planRows.map((p) => ({
        ...p,
        price: String(p.price),
        featureIds: byPlan.get(p.id) ?? [],
      })),
      features: featureRows,
      canEditPlan: session.role === "admin",
    });
  } catch (e) {
    console.error("[GET /api/settings/plan]", e);
    return jsonErr("Error al cargar planes", 500);
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return jsonErr("No autorizado", 401);
  }
  if (session.role !== "admin") {
    return jsonErr("Solo un administrador puede actualizar el plan", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErr("Cuerpo JSON inválido", 400);
  }

  const nextPlanId =
    body && typeof body === "object" && "plan_id" in body
      ? String((body as { plan_id: unknown }).plan_id ?? "")
      : "";
  if (!nextPlanId) {
    return jsonErr("Plan inválido", 400);
  }

  try {
    const db = getDb();

    const [planExists] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(and(eq(plans.id, nextPlanId), eq(plans.is_active, true)))
      .limit(1);
    if (!planExists) {
      return jsonErr("El plan no existe o está inactivo", 400);
    }

    await db
      .update(companies)
      .set({
        plan_id: nextPlanId,
        updated_at: new Date(),
      })
      .where(eq(companies.id, session.company.id));

    return jsonOk({ plan_id: nextPlanId });
  } catch (e) {
    console.error("[PATCH /api/settings/plan]", e);
    return jsonErr("Error al actualizar plan", 500);
  }
}
