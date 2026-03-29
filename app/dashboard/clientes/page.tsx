import { CrudExplorerClient } from "@/components/dashboard/crud-explorer-client";

export default function ClientesControlPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Control de Clientes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Listado y mantenimiento de clientes de tu empresa (multi-tenant). Misma
          base que el explorador CRUD, con vista tabla o tarjetas.
        </p>
      </div>
      <CrudExplorerClient variant="doctype" fixedTable="clients" />
    </div>
  );
}
