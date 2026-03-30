import { ActualizarPlanClient } from "@/components/dashboard/actualizar-plan-client";

export default function ActualizarPlanPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Actualizar plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí un plan disponible para tu empresa.
        </p>
      </div>
      <ActualizarPlanClient />
    </div>
  );
}
