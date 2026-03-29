import { CrudExplorerClient } from "@/components/dashboard/crud-explorer-client";

export default function CrudExplorerPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Explorador CRUD
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Herramienta solo para administradores: listar, crear, editar y borrar
          filas en tablas permitidas. Los datos se filtran por empresa cuando la
          tabla es multi-tenant. Las tablas y permisos están definidos en código
          (lista blanca), no se aceptan nombres arbitrarios desde el cliente.
        </p>
      </div>
      <CrudExplorerClient />
    </div>
  );
}
