import Link from "next/link";

export default function ComprasNuevoPlaceholderPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Nueva compra</h1>
      <p className="text-sm text-muted-foreground">
        El registro de compras lo definiremos en un paso aparte.
      </p>
      <Link
        href="/dashboard/compras"
        className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        ← Volver a Compras
      </Link>
    </div>
  );
}
