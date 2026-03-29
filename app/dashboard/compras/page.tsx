import { CrudExplorerClient } from "@/components/dashboard/crud-explorer-client";

export default function ComprasControlPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Control de Compras
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro de compras por empresa. Podés ampliar columnas en el esquema y
          en la lista blanca del CRUD cuando definas más campos.
        </p>
      </div>
      <CrudExplorerClient variant="doctype" fixedTable="purchases" />
    </div>
  );
}
