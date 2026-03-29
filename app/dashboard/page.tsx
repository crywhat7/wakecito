import { DashboardHubNav } from "@/components/dashboard/dashboard-hub-nav";

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mb-2 text-sm text-muted-foreground">
        Elegí un módulo para ver opciones.
      </p>
      <DashboardHubNav />
    </div>
  );
}
