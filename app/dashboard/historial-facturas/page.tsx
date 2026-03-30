import { InvoiceHistoryClient } from "@/components/dashboard/invoice-history-client";

export default function HistorialFacturasPage() {
  return (
    <div className="mx-auto max-w-[1200px]">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Historial de facturas
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Resumen y listado de ventas registradas en tu empresa.
      </p>
      <InvoiceHistoryClient />
    </div>
  );
}
