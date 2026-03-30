"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PlanItem = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  sort_order: number;
  featureIds: string[];
};

type FeatureItem = {
  id: string;
  name: string;
  sort_order: number;
};

type PlanData = {
  currentPlanId: string;
  plans: PlanItem[];
  features: FeatureItem[];
  canEditPlan: boolean;
};

function formatPrice(price: string, currency: string) {
  const n = Number.parseFloat(price);
  if (!Number.isFinite(n)) return price;
  const cc = currency === "L." || currency === "L" ? "HNL" : currency;
  try {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: cc,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `L ${n.toFixed(0)}`;
  }
}

export function ActualizarPlanClient() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<PlanData | null>(null);
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const res = await fetch("/api/settings/plan", { credentials: "include" });
        const json = (await res.json()) as
          | { success: true; data: PlanData }
          | { success: false; error: string };
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setLoadError(!json.success ? json.error : "Error al cargar planes");
          return;
        }
        setData(json.data);
        setSelectedPlanId(json.data.currentPlanId);
      } catch {
        if (!cancelled) setLoadError("No se pudo cargar los planes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onUpdatePlan() {
    if (!data?.canEditPlan || !selectedPlanId || selectedPlanId === data.currentPlanId) return;
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings/plan", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: selectedPlanId }),
      });
      const json = (await res.json()) as
        | { success: true; data: { plan_id: string } }
        | { success: false; error: string };
      if (!res.ok || !json.success) {
        setMsg({ type: "err", text: !json.success ? json.error : "Error al actualizar" });
        return;
      }
      setData((prev) => (prev ? { ...prev, currentPlanId: selectedPlanId } : prev));
      setMsg({ type: "ok", text: "Plan actualizado correctamente." });
      router.refresh();
    } catch {
      setMsg({ type: "err", text: "Error de red" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando planes...</p>;
  }
  if (loadError || !data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError ?? "Sin datos"}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!data.canEditPlan ? (
        <p className="text-sm text-muted-foreground">
          Solo los administradores pueden cambiar el plan de la empresa.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {data.plans.map((plan) => {
          const isCurrent = data.currentPlanId === plan.id;
          const isSelected = selectedPlanId === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              disabled={!data.canEditPlan}
              onClick={() => setSelectedPlanId(plan.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                isSelected
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-border hover:bg-muted/40",
                !data.canEditPlan && "cursor-not-allowed opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <IconCheck className="size-3.5" stroke={1.8} />
                    Actual
                  </span>
                ) : null}
              </div>
              <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                {plan.description || "Plan para tu operación"}
              </p>
              <p className="mt-3 text-2xl font-bold">
                {formatPrice(plan.price, plan.currency)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/mes</span>
              </p>
              <ul className="mt-4 space-y-2">
                {data.features.map((feature) => {
                  const included = plan.featureIds.includes(feature.id);
                  return (
                    <li key={feature.id} className="flex items-start gap-1.5 text-xs">
                      {included ? (
                        <IconCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" stroke={2} />
                      ) : (
                        <IconX className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" stroke={2} />
                      )}
                      <span className={included ? "text-foreground" : "text-muted-foreground line-through"}>
                        {feature.name}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {msg ? (
          <p
            className={cn(
              "text-sm",
              msg.type === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
            )}
            role="status"
          >
            {msg.text}
          </p>
        ) : (
          <span />
        )}
        <Button
          type="button"
          onClick={() => void onUpdatePlan()}
          disabled={!data.canEditPlan || saving || selectedPlanId === data.currentPlanId}
        >
          {saving ? "Actualizando..." : "Actualizar plan"}
        </Button>
      </div>
    </div>
  );
}
