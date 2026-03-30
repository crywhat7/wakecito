"use client";

import * as React from "react";
import Link from "next/link";

type Row = {
  id: string;
  expense_date: string;
  total_amount: string;
  currency: string;
  payment_type: string;
  expected_payment_date: string | null;
  description: string | null;
  category_id: string;
  category_name: string;
};

export function ExpensesListClient() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const res = await fetch("/api/expenses?page=1&page_size=50", {
          credentials: "include",
        });
        const json = (await res.json()) as
          | { success: true; data: { expenses: Row[] } }
          | { success: false; error: string };
        if (!res.ok || !json.success) {
          throw new Error(!json.success ? json.error : "Error");
        }
        if (!cancelled) setRows(json.data.expenses);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Error al cargar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando gastos…</p>;
  }
  if (err) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {err}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no registraste gastos.{" "}
        <Link
          href="/dashboard/gastos/nuevo"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Registrar uno
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/80">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/80 bg-muted/30 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Fecha</th>
            <th className="px-3 py-2 font-medium">Categoría</th>
            <th className="px-3 py-2 font-medium">Monto</th>
            <th className="px-3 py-2 font-medium">Pago</th>
            <th className="px-3 py-2 font-medium">Vencimiento</th>
            <th className="px-3 py-2 font-medium">Nota</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-b border-border/40 last:border-0 hover:bg-muted/20"
            >
              <td className="px-3 py-2 tabular-nums">{r.expense_date}</td>
              <td className="px-3 py-2">{r.category_name}</td>
              <td className="px-3 py-2 font-medium tabular-nums">
                {r.currency === "HNL" ? "L" : r.currency} {r.total_amount}
              </td>
              <td className="px-3 py-2">
                {r.payment_type === "credit" ? "Crédito" : "Contado"}
              </td>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">
                {r.expected_payment_date ?? "—"}
              </td>
              <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                {r.description ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
