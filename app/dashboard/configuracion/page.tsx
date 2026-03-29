import { ConfiguracionClient } from "@/components/dashboard/configuracion-client";

export default function ConfiguracionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos de tu empresa y de tu usuario.
        </p>
      </div>
      <ConfiguracionClient />
    </div>
  );
}
