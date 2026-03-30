import { ProductsInventoryClient } from "@/components/dashboard/products-inventory-client";

export default function ProductosPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lista de Productos, puedes crear nuevos productos en: {" "}
          <a
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="/dashboard/productos/nuevo"
          >
            Nuevo producto
          </a>
          .
        </p>
      </div>
      <ProductsInventoryClient />
    </div>
  );
}
