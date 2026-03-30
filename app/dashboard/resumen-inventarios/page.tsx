import { InventorySummaryClient } from "@/components/dashboard/inventory-summary-client";

export default function ResumenInventariosPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Resumen de inventarios
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Métricas del catálogo, valor de inventario y ajuste rápido de stock por
          producto. Podés abrir el detalle completo en{" "}
          <a
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="/dashboard/productos"
          >
            Productos
          </a>
          .
        </p>
      </div>
      <InventorySummaryClient />
    </div>
  );
}
