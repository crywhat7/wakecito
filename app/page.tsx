import { IconCheck, IconX } from "@tabler/icons-react";
import { asc, eq, inArray } from "drizzle-orm";

import { features, plan_features, plans } from "@/app/db/schema";
import { WakecitoHero } from "@/components/landing/wakecito-hero";
import { getDb } from "@/db";

type LandingPlan = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
};

type LandingFeature = {
  id: string;
  name: string;
  description: string | null;
};

const MAX_PLANS_TO_SHOW = 3;

const CURRENCY_ALIASES: Record<string, string> = {
  L: "HNL",
  "L.": "HNL",
};

function formatPlanPrice(price: string, currency: string) {
  const value = Number(price);
  if (Number.isNaN(value)) {
    return price;
  }

  const normalizedCurrency = CURRENCY_ALIASES[currency.trim()] ?? currency.trim().toUpperCase();

  try {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    // Fallback para códigos no ISO guardados en BD.
    return `L. ${new Intl.NumberFormat("es-HN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)}`;
  }
}

async function getPricingData() {
  const db = getDb();

  const activePlans = await db
    .select({
      id: plans.id,
      name: plans.name,
      description: plans.description,
      price: plans.price,
      currency: plans.currency,
    })
    .from(plans)
    .where(eq(plans.is_active, true))
    .orderBy(asc(plans.sort_order), asc(plans.price))
    .limit(MAX_PLANS_TO_SHOW);

  const allFeatures = await db
    .select({
      id: features.id,
      name: features.name,
      description: features.description,
    })
    .from(features)
    .orderBy(asc(features.sort_order), asc(features.name));

  if (activePlans.length === 0 || allFeatures.length === 0) {
    return { activePlans, allFeatures, planFeatureIdsByPlan: new Map<string, Set<string>>() };
  }

  const planIds = activePlans.map((plan) => plan.id);

  const featureAssignments = await db
    .select({
      planId: plan_features.plan_id,
      featureId: plan_features.feature_id,
    })
    .from(plan_features)
    .where(inArray(plan_features.plan_id, planIds));

  const planFeatureIdsByPlan = new Map<string, Set<string>>();
  for (const assignment of featureAssignments) {
    if (!planFeatureIdsByPlan.has(assignment.planId)) {
      planFeatureIdsByPlan.set(assignment.planId, new Set<string>());
    }
    planFeatureIdsByPlan.get(assignment.planId)?.add(assignment.featureId);
  }

  return { activePlans, allFeatures, planFeatureIdsByPlan };
}

function PricingCard({
  plan,
  allFeatures,
  includedFeatures,
  isFeatured,
}: {
  plan: LandingPlan;
  allFeatures: LandingFeature[];
  includedFeatures: Set<string>;
  isFeatured: boolean;
}) {
  return (
    <article
      className={[
        "rounded-2xl border bg-white shadow-sm transition-transform",
        isFeatured
          ? "border-emerald-300 p-7 md:-my-2 md:scale-[1.04] md:shadow-lg"
          : "border-emerald-100 p-6",
      ].join(" ")}
    >
      <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
      <p className="mt-2 min-h-12 text-sm text-slate-600">
        {plan.description ?? "Plan diseñado para impulsar tu operación diaria."}
      </p>

      <div className="mt-4">
        <span className="text-4xl font-extrabold tracking-tight text-slate-900">
          {formatPlanPrice(plan.price, plan.currency)}
        </span>
        <span className="ml-1 text-slate-500">/mes</span>
      </div>

      <ul className="mt-6 space-y-3">
        {allFeatures.map((feature) => {
          const isIncluded = includedFeatures.has(feature.id);
          return (
            <li key={feature.id} className="flex items-start gap-2">
              {isIncluded ? (
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
              ) : (
                <IconX className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              )}
              <span
                className={isIncluded ? "text-slate-700" : "text-slate-400 line-through"}
                title={feature.description ?? undefined}
              >
                {feature.name}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default async function Page() {
  const { activePlans, allFeatures, planFeatureIdsByPlan } = await getPricingData();

  return (
    <>
      <WakecitoHero />

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Planes de soluciones</h2>
          <p className="mt-3 text-slate-600">
            Elegí el plan que mejor se adapte a tu negocio y compará todas las funcionalidades.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {activePlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              allFeatures={allFeatures}
              includedFeatures={planFeatureIdsByPlan.get(plan.id) ?? new Set<string>()}
              isFeatured={plan.name.trim().toLowerCase() === "plus"}
            />
          ))}
        </div>
      </section>
    </>
  );
}
