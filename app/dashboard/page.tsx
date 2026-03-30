import { DashboardHomeClient } from "@/components/dashboard/dashboard-home-client";
import { DashboardHubNav } from "@/components/dashboard/dashboard-hub-nav";

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Inicio</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Resumen general y accesos rápidos.
      </p>
      <DashboardHomeClient />
      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">Módulos</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          También podés navegar por el hub de módulos.
        </p>
        <DashboardHubNav />
      </div>
    </div>
  );
}
