import Link from "next/link";

export default function ClientesNuevoPlaceholderPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo cliente</h1>
      <p className="text-sm text-muted-foreground">
        El alta de clientes la definiremos en un paso aparte.
      </p>
      <Link
        href="/dashboard/clientes"
        className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        ← Volver a Clientes
      </Link>
    </div>
  );
}
