import { CrudExplorerClient } from "@/components/dashboard/crud-explorer-client";

export default function ProductosPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Listado y edición de artículos de inventario. Para altas guiadas usá{" "}
          <a
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="/dashboard/productos/nuevo"
          >
            Nuevo producto
          </a>
          .
        </p>
      </div>
      <CrudExplorerClient variant="doctype" fixedTable="products" />
    </div>
  );
}
