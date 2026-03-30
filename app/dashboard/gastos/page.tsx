import { ExpensesListClient } from "@/components/dashboard/expenses-list-client";

export default function GastosPage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro de egresos por categoría. Podés cargar productos para aumentar
          inventario desde{" "}
          <a
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="/dashboard/gastos/nuevo"
          >
            Nuevo gasto
          </a>
          .
        </p>
      </div>
      <ExpensesListClient />
    </div>
  );
}
