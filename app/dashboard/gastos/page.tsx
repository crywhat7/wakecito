import Link from "next/link";

import { ExpensesListClient } from "@/components/dashboard/expenses-list-client";
import { Button } from "@/components/ui/button";

export default function GastosPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Egresos por categoría, contado o crédito. Los totales superiores
            suman todos los gastos de la empresa; la tabla respeta búsqueda y
            filtro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/gastos/nuevo">+ Registrar gasto</Link>
          </Button>
        </div>
      </div>
      <ExpensesListClient />
    </div>
  );
}
