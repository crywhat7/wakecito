import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { plans } from "@/app/db/schema";
import * as schema from "@/app/db/schema";

export type WakecitoDb = PostgresJsDatabase<typeof schema>;

/** Plan con precio 0 o creación del plan Gratis si la base está vacía. */
export async function getOrCreateFreePlanId(db: WakecitoDb): Promise<string> {
  const existing = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.price, "0"))
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const [created] = await db
    .insert(plans)
    .values({
      name: "Gratis",
      description: "Plan por defecto al registrarse",
      price: "0",
      currency: "HNL",
    })
    .returning({ id: plans.id });

  if (!created) {
    throw new Error("No se pudo crear el plan gratuito");
  }

  return created.id;
}
